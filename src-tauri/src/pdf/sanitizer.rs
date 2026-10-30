//! Sanitization utilities for Unicode text to ensure safe text shaping and PDF export.

/// Returns true if `c` is an Indic combining mark (vowel sign, virama, anusvara, nukta, etc.)
pub fn is_indic_combining(c: char) -> bool {
    let code = c as u32;
    // Devanagari: 0x0901..=0x0903, 0x093C, 0x093E..=0x094F, 0x0951..=0x0957, 0x0962..=0x0963
    if (0x0901..=0x0903).contains(&code)
        || code == 0x093C
        || (0x093E..=0x094F).contains(&code)
        || (0x0951..=0x0957).contains(&code)
        || (0x0962..=0x0963).contains(&code)
    {
        return true;
    }
    // Bengali: 0x0981..=0x0983, 0x09BC, 0x09BE..=0x09CD, 0x09D7, 0x09E2..=0x09E3
    if (0x0981..=0x0983).contains(&code)
        || code == 0x09BC
        || (0x09BE..=0x09CD).contains(&code)
        || code == 0x09D7
        || (0x09E2..=0x09E3).contains(&code)
    {
        return true;
    }
    // Gurmukhi: 0x0A01..=0x0A03, 0x0A3C, 0x0A3E..=0x0A4D, 0x0A70..=0x0A71
    if (0x0A01..=0x0A03).contains(&code)
        || code == 0x0A3C
        || (0x0A3E..=0x0A4D).contains(&code)
        || (0x0A70..=0x0A71).contains(&code)
    {
        return true;
    }
    // Gujarati: 0x0A81..=0x0A83, 0x0ABC, 0x0ABE..=0x0ACD
    if (0x0A81..=0x0A83).contains(&code) || code == 0x0ABC || (0x0ABE..=0x0ACD).contains(&code) {
        return true;
    }
    // Oriya: 0x0B01..=0x0B03, 0x0B3C, 0x0B3E..=0x0B4D, 0x0B56..=0x0B57
    if (0x0B01..=0x0B03).contains(&code)
        || code == 0x0B3C
        || (0x0B3E..=0x0B4D).contains(&code)
        || (0x0B56..=0x0B57).contains(&code)
    {
        return true;
    }
    // Tamil: 0x0B82, 0x0BBE..=0x0BCD, 0x0BD7
    if code == 0x0B82 || (0x0BBE..=0x0BCD).contains(&code) || code == 0x0BD7 {
        return true;
    }
    // Telugu: 0x0C00..=0x0C03, 0x0C3E..=0x0C4D, 0x0C55..=0x0C56
    if (0x0C00..=0x0C03).contains(&code)
        || (0x0C3E..=0x0C4D).contains(&code)
        || (0x0C55..=0x0C56).contains(&code)
    {
        return true;
    }
    // Kannada: 0x0C81..=0x0C83, 0x0CBC, 0x0CBE..=0x0CCD, 0x0CD5..=0x0CD6
    if (0x0C81..=0x0C83).contains(&code)
        || code == 0x0CBC
        || (0x0CBE..=0x0CCD).contains(&code)
        || (0x0CD5..=0x0CD6).contains(&code)
    {
        return true;
    }
    // Malayalam: 0x0D00..=0x0D03, 0x0D3B..=0x0D3C, 0x0D3E..=0x0D4D, 0x0D57
    if (0x0D00..=0x0D03).contains(&code)
        || (0x0D3B..=0x0D3C).contains(&code)
        || (0x0D3E..=0x0D4D).contains(&code)
        || code == 0x0D57
    {
        return true;
    }
    false
}

/// Returns true if `c` is an Indic base character (independent vowel or consonant).
pub fn is_indic_base(c: char) -> bool {
    let code = c as u32;
    (0x0904..=0x0939).contains(&code)
        || (0x0985..=0x09B9).contains(&code)
        || (0x0A05..=0x0A39).contains(&code)
        || (0x0A85..=0x0AB9).contains(&code)
        || (0x0B05..=0x0B39).contains(&code)
        || (0x0B85..=0x0BB9).contains(&code)
        || (0x0C05..=0x0C39).contains(&code)
        || (0x0C85..=0x0CB9).contains(&code)
        || (0x0D05..=0x0D39).contains(&code)
}

/// Strips orphan/unattached Indic combining marks that lack a valid base.
///
/// Orphan combining marks (for example, typing a Tamil vowel sign like `.\u{0bc0}` directly
/// after punctuation or whitespace) produce malformed OpenType shaping runs and trigger
/// font fallback failures in PDF subsetters.
pub fn sanitize_text(src: &str) -> String {
    let mut out = String::with_capacity(src.len());
    let mut last_char: Option<char> = None;

    for c in src.chars() {
        if is_indic_combining(c) {
            match last_char {
                Some(prev) if is_indic_base(prev) || is_indic_combining(prev) => {
                    out.push(c);
                    last_char = Some(c);
                }
                _ => {
                    // Orphan combining mark - safely skip it
                    continue;
                }
            }
        } else {
            out.push(c);
            last_char = Some(c);
        }
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_orphan_marks() {
        // Valid Tamil sequence should be untouched
        let valid = "தமிழ் தட்டச்சு";
        assert_eq!(sanitize_text(valid), valid);

        // Orphan combining mark after dot or comma should be stripped
        let with_orphan = "VEERAMANI.ீ DRONE,ீ TEST";
        assert_eq!(sanitize_text(with_orphan), "VEERAMANI. DRONE, TEST");

        // Leading combining mark at line start should be stripped
        let leading = "ீதமிழ்";
        assert_eq!(sanitize_text(leading), "தமிழ்");
    }
}
