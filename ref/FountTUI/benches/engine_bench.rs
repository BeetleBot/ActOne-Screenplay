use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};

use fount::config::Config;
use fount::layout::build_layout;
use fount::parser::Parser;

fn generate_doc(num_lines: usize) -> Vec<String> {
    let chunk = vec![
        "INT. FABRIKHALLE - MORGEN".to_string(),
        "Die Werksirene dröhnt. Die Stechuhr stöhnt beim Stechen lustvoll.".to_string(),
        "In der Montagehalle strahlt die Neonsonne.".to_string(),
        "Der Gabelstaplerführer prahlt mit der Stapelgabel.".to_string(),
        "".to_string(),
        "ARBEITERCHOR".to_string(),
        "(singend)".to_string(),
        "~Ja, dann wird wieder in die Hände gespuckt!".to_string(),
        "~Wir steigern das **Bruttosozialprodukt**!".to_string(),
        "~Ja-ja-ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "".to_string(),
        "INT. KRANKENHAUS - TAG".to_string(),
        "Die Krankenschwester kriegt einen Riesenschreck. [[Ein Kranker ist weg!]]".to_string(),
        "Sie amputierten ihm sein letztes Bein.".to_string(),
        "Jetzt kniet er sich wieder mächtig rein.".to_string(),
        "".to_string(),
        "ARBEITERCHOR".to_string(),
        "(singend)".to_string(),
        "~Ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "~Wir steigern das **Bruttosozialprodukt**!".to_string(),
        "~Ja-ja-ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "".to_string(),
        "EXT. STRASSE - SONNTAG".to_string(),
        "Opa schwingt sich auf sein Fahrrad.".to_string(),
        "Oma hat Angst, dass er zusammenbricht.".to_string(),
        "".to_string(),
        "INT. FABRIKHALLE - SONNTAG".to_string(),
        "/* Opa macht heute wieder Sonderschicht */".to_string(),
        "Opa dringt heimlich in die Fabrik ein.".to_string(),
        "".to_string(),
        "ARBEITERCHOR".to_string(),
        "(singend)".to_string(),
        "~Ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "~Wir steigern das **Bruttosozialprodukt**!".to_string(),
        "~Ja-ja-ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "".to_string(),
        "> INSTRUMENTAL <".to_string(),
        "".to_string(),
        "INT. WOHNZIMMER - WEIHNACHTEN".to_string(),
        "Alle liegen rum und sagen: \"Puh-uh-uh-uh\".".to_string(),
        "Der Abfalleimer geht schon nicht mehr zu.".to_string(),
        "Die Gabentische werden immer bunter.".to_string(),
        "".to_string(),
        "EXT. STRASSE - MITTWOCH".to_string(),
        "Die Müllabfuhr kommt und holt den ganzen Plunder.".to_string(),
        "".to_string(),
        "ARBEITERCHOR".to_string(),
        "(singend)".to_string(),
        "~Jetzt wird wieder in die Hände gespuckt!".to_string(),
        "~Wir steigern das **Bruttosozialprodukt**!".to_string(),
        "~Ja-ja-ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "".to_string(),
        "INT. FABRIKHALLE - SPÄTER".to_string(),
        "Die Werksirene dröhnt. Die Stechuhr stöhnt beim Stechen lustvoll.".to_string(),
        "Die Arbeitswut hat einen nach dem andern gepackt.".to_string(),
        "Sie singen zusammen im Arbeitstakt-takt-takt-takt-takt-takt-takt.".to_string(),
        "".to_string(),
        "ARBEITERCHOR".to_string(),
        "(singend, tutti)".to_string(),
        "~Ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "~Wir steigern das **Bruttosozialprodukt**!".to_string(),
        "~Ja-ja-ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "~Wir steigern das **Bruttosozialprodukt**!".to_string(),
        "~Ja-ja-ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "~Wir steigern das **Bruttosozialprodukt**!".to_string(),
        "~Ja-ja-ja, jetzt wird wieder in die Hände gespuckt!".to_string(),
        "".to_string(),
        "> FADE OUT.".to_string(),
        "".to_string(),
    ];

    let mut doc = Vec::with_capacity(num_lines);
    while doc.len() < num_lines {
        for line in &chunk {
            if doc.len() >= num_lines {
                break;
            }
            doc.push(line.clone());
        }
    }
    doc
}

fn bench_parser(c: &mut Criterion) {
    let lines = generate_doc(10_000);

    c.bench_function("Parser::parse/10000_lines", |b| {
        b.iter(|| Parser::parse(black_box(&lines)))
    });
}

fn bench_build_layout(c: &mut Criterion) {
    let lines = generate_doc(10_000);
    let types = Parser::parse(&lines);
    let config = Config::default();
    let theme = fount::theme::Theme::default();

    c.bench_function("build_layout/10000_lines", |b| {
        let mut visual_lines = Vec::new();
        b.iter(|| {
            build_layout(
                black_box(&lines),
                black_box(&types),
                black_box(5_000),
                black_box(&config),
                black_box(&theme),
                black_box(&mut visual_lines),
            )
        })
    });
}

criterion_group!(benches, bench_parser, bench_build_layout);
criterion_main!(benches);
