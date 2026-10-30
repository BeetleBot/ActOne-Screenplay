use super::{
    cancellable,
    transform::{self, Element, TransformRequest},
    types::{Context, ProviderConfig},
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        Arc, LazyLock, Mutex,
        atomic::{AtomicBool, Ordering},
    },
};
use tauri::{Emitter, Manager};

static PAUSED: LazyLock<Mutex<HashMap<String, Arc<AtomicBool>>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JobItem {
    pub line: usize,
    pub prefix: String,
    pub suffix: String,
    pub indent: String,
    pub element: Element,
    pub scene: usize,
    pub heading: String,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    pub language: String,
    pub instructions: String,
    pub lines: Vec<String>,
    pub items: Vec<JobItem>,
    pub completed: Vec<String>,
    pub failed: Vec<String>,
    pub destination: String,
    pub status: String,
    pub current_heading: String,
    pub total_scenes: usize,
    #[serde(default)]
    pub temperature: Option<f64>,
    #[serde(default)]
    pub last_error: Option<String>,
    #[serde(default)]
    pub source_revisions: Vec<String>,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobRequest {
    pub job: Job,
    pub config: ProviderConfig,
    pub retry: bool,
}
fn validate_job(job: &Job, destination: &str) -> Result<(), String> {
    if job.destination != destination {
        return Err("This job was approved for a different endpoint. Select its original provider to resume.".into());
    }
    let mut ids = std::collections::HashSet::new();
    let mut positions = std::collections::HashSet::new();
    for item in &job.items {
        if item.line >= job.lines.len()
            || item.element.id.is_empty()
            || !ids.insert(item.element.id.as_str())
            || !positions.insert(item.line)
        {
            return Err("Invalid or duplicate translation source positions.".into());
        }
    }
    if job
        .completed
        .iter()
        .chain(job.failed.iter())
        .any(|id| !ids.contains(id.as_str()))
    {
        return Err("Checkpoint contains unknown work identifiers.".into());
    }
    Ok(())
}
fn revision(lines: &[String]) -> String {
    format!("{:x}", Sha256::digest(lines.join("\n").as_bytes()))
}

fn apply_batch(
    job: &mut Job,
    batch: &[JobItem],
    result: transform::TransformResult,
) -> Result<(), String> {
    let elements: Vec<_> = batch.iter().map(|i| i.element.clone()).collect();
    transform::validate(
        &serde_json::to_string(&result).map_err(|e| e.to_string())?,
        &elements,
    )?;
    let before = revision(&job.lines);
    if !job.source_revisions.contains(&before) {
        job.source_revisions.push(before);
    }
    let by_id: HashMap<_, _> = result
        .replacements
        .into_iter()
        .map(|r| (r.id, r.text))
        .collect();
    for item in batch {
        let text = &by_id[&item.element.id];
        job.lines[item.line] = format!("{}{}{}{}", item.indent, item.prefix, text, item.suffix);
        if !job.completed.contains(&item.element.id) {
            job.completed.push(item.element.id.clone());
        }
    }
    job.source_revisions.push(revision(&job.lines));
    Ok(())
}
fn pending(job: &Job) -> Vec<JobItem> {
    job.items
        .iter()
        .filter(|i| !job.completed.contains(&i.element.id) && !job.failed.contains(&i.element.id))
        .cloned()
        .collect()
}
fn path(window: &tauri::WebviewWindow, id: &str) -> Result<PathBuf, String> {
    if id.len() > 100 || id.is_empty() || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("Invalid job identity.".into());
    }
    let dir = window
        .app_handle()
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("urai-jobs");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{id}.json")))
}
fn save(path: &std::path::Path, job: &Job) -> Result<(), String> {
    super::super::write_file_atomically(
        path,
        serde_json::to_string(job).map_err(|e| e.to_string())?,
    )
}
fn emit(window: &tauri::WebviewWindow, job: &Job) {
    let _ = window.emit_to(window.label(), "urai-job", job);
}
#[tauri::command]
pub fn urai_pause_job(window: tauri::WebviewWindow, job_id: String, paused: bool) {
    if let Ok(jobs) = PAUSED.lock() {
        if let Some(flag) = jobs.get(&format!("{}:{job_id}", window.label())) {
            flag.store(paused, Ordering::SeqCst);
        }
    }
}
#[tauri::command]
pub fn urai_load_job(window: tauri::WebviewWindow, job_id: String) -> Result<Job, String> {
    let bytes =
        std::fs::read(path(&window, &job_id)?).map_err(|_| "Translation checkpoint not found.")?;
    serde_json::from_slice(&bytes).map_err(|_| "Invalid translation checkpoint.".into())
}
#[tauri::command]
pub async fn urai_run_job(
    window: tauri::WebviewWindow,
    request: JobRequest,
) -> Result<Job, String> {
    let id = request.job.id.clone();
    let result = cancellable(&window, &id, run_job_inner(&window, request)).await;
    if result.as_ref().is_err_and(|e| e == "Aborted") {
        if let Ok(checkpoint) = path(&window, &id) {
            if let Ok(bytes) = std::fs::read(&checkpoint) {
                if let Ok(mut saved) = serde_json::from_slice::<Job>(&bytes) {
                    saved.status = "interrupted".into();
                    save(&checkpoint, &saved)?;
                    emit(&window, &saved);
                }
            }
        }
    }
    result
}
struct PauseGuard(String);
impl Drop for PauseGuard {
    fn drop(&mut self) {
        if let Ok(mut paused) = PAUSED.lock() {
            paused.remove(&self.0);
        }
    }
}
async fn run_job_inner(window: &tauri::WebviewWindow, request: JobRequest) -> Result<Job, String> {
    let checkpoint = path(&window, &request.job.id)?;
    let mut job = if checkpoint.exists() {
        serde_json::from_slice(&std::fs::read(&checkpoint).map_err(|e| e.to_string())?)
            .map_err(|_| "Invalid translation checkpoint.")?
    } else {
        request.job
    };
    let config = request.config;
    let destination = format!("{}:{}", config.provider, config.endpoint);
    validate_job(&job, &destination)?;
    if job.source_revisions.is_empty() {
        job.source_revisions.push(revision(&job.lines));
    }
    if request.retry {
        job.failed.clear();
    }
    job.status = "running".into();
    save(&checkpoint, &job)?;
    emit(&window, &job);
    let paused = Arc::new(AtomicBool::new(false));
    let pause_key = format!("{}:{}", window.label(), job.id);
    PAUSED
        .lock()
        .map_err(|_| "Job registry unavailable.")?
        .insert(pause_key.clone(), paused.clone());
    let _pause_guard = PauseGuard(pause_key);
    let result: Result<Job, String> = async {
        let pending = pending(&job);
        // Small coherent batches keep output reliable on local models. Retry only original work ids.
        let mut offset = 0;
        while offset < pending.len() {
            while paused.load(Ordering::SeqCst) {
                job.status = "paused".into();
                emit(&window, &job);
                tokio::time::sleep(std::time::Duration::from_millis(200)).await;
            }
            job.status = "running".into();
            let mut end = offset;
            let mut size = 0;
            while end < pending.len()
                && end - offset < 8
                && pending[end].scene == pending[offset].scene
            {
                let next = super::types::estimated_tokens(&pending[end].element.text) + 64;
                if end > offset && size + next > config.context_tokens / 6 {
                    break;
                }
                size += next;
                end += 1;
            }
            let batch = &pending[offset..end];
            job.current_heading = batch[0].heading.clone();
            emit(&window, &job);
            let request = TransformRequest {
                request_id: job.id.clone(),
                config: config.clone(),
                operation: "translate".into(),
                language: job.language.clone(),
                instructions: job.instructions.clone(),
                elements: batch.iter().map(|i| i.element.clone()).collect(),
                context: Context::default(),
                temperature: job.temperature.or(Some(0.1)),
            };
            let mut attempt = 0;
            let translated = loop {
                let result = transform::run(&request).await;
                if let Err(error) = &result {
                    if let Some(seconds) = error
                        .strip_prefix("RATE_LIMIT:")
                        .and_then(|s| s.parse::<u64>().ok())
                    {
                        if attempt < 2 {
                            job.status = "waiting".into();
                            emit(&window, &job);
                            tokio::time::sleep(std::time::Duration::from_secs(seconds.min(120)))
                                .await;
                            attempt += 1;
                            continue;
                        }
                    }
                }
                break result;
            };
            match translated {
                Ok(result) => {
                    apply_batch(&mut job, batch, result)?;
                    job.last_error = None;
                }
                Err(error) => {
                    job.last_error = Some(error);
                    for item in batch {
                        job.failed.push(item.element.id.clone());
                    }
                }
            }
            save(&checkpoint, &job)?;
            emit(&window, &job);
            offset = end;
        }
        job.status = if job.failed.is_empty() {
            "completed"
        } else {
            "partial"
        }
        .into();
        save(&checkpoint, &job)?;
        emit(&window, &job);
        Ok(job.clone())
    }
    .await;
    if result.is_err() {
        let mut saved: Job =
            serde_json::from_slice(&std::fs::read(&checkpoint).map_err(|e| e.to_string())?)
                .map_err(|e| e.to_string())?;
        saved.status = "interrupted".into();
        save(&checkpoint, &saved)?;
        emit(&window, &saved);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    fn job() -> Job {
        Job {
            id: "test".into(),
            language: "Tamil".into(),
            instructions: "preserve voice".into(),
            lines: vec!["one".into(), "two".into()],
            items: (0..2)
                .map(|line| JobItem {
                    line,
                    prefix: String::new(),
                    suffix: String::new(),
                    indent: String::new(),
                    element: Element {
                        id: format!("line-{line}"),
                        text: format!("source {line}"),
                        kind: "dialogue".into(),
                        speaker: "JOHN".into(),
                    },
                    scene: 0,
                    heading: "INT. ROOM".into(),
                })
                .collect(),
            completed: vec![],
            failed: vec![],
            destination: "ollama:http://localhost:11434".into(),
            status: "running".into(),
            current_heading: String::new(),
            total_scenes: 1,
            temperature: Some(0.2),
            last_error: None,
            source_revisions: vec![],
        }
    }
    #[test]
    fn rejects_changed_destination_and_duplicate_source() {
        let mut j = job();
        assert!(validate_job(&j, "remote").is_err());
        j.items[1].element.id = "line-0".into();
        assert!(validate_job(&j, &j.destination).is_err());
    }
    #[test]
    fn checkpoint_retry_preserves_success_and_original_source() {
        let mut j = job();
        let batch = vec![j.items[0].clone()];
        apply_batch(
            &mut j,
            &batch,
            transform::TransformResult {
                replacements: vec![transform::Replacement {
                    id: "line-0".into(),
                    text: "வணக்கம்".into(),
                }],
            },
        )
        .unwrap();
        j.failed.push("line-1".into());
        let encoded = serde_json::to_string(&j).unwrap();
        let mut recovered: Job = serde_json::from_str(&encoded).unwrap();
        assert!(pending(&recovered).is_empty());
        recovered.failed.clear();
        let remaining = pending(&recovered);
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].element.text, "source 1");
        assert_eq!(recovered.lines[0], "வணக்கம்");
        assert!(!encoded.contains("apiKey"));
    }
    #[test]
    fn incomplete_batch_does_not_mutate_target() {
        let mut j = job();
        let before = j.lines.clone();
        let batch = j.items.clone();
        assert!(
            apply_batch(
                &mut j,
                &batch,
                transform::TransformResult {
                    replacements: vec![transform::Replacement {
                        id: "line-0".into(),
                        text: "partial".into()
                    }]
                }
            )
            .is_err()
        );
        assert_eq!(j.lines, before);
        assert!(j.completed.is_empty());
    }
}
