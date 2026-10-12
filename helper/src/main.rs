use bbscript_helper::protocol::HelperResponse;
use bbscript_helper::runtime::run_from_stdin;

fn main() {
    let response = match run_from_stdin() {
        Ok(resp) => resp,
        Err(err) => HelperResponse::fatal(format!("Fatal helper error: {err}")),
    };

    match serde_json::to_string(&response) {
        Ok(json) => println!("{json}"),
        Err(err) => {
            let fallback = HelperResponse::fatal(format!(
                "Failed to serialize helper response: {err}"
            ));
            println!(
                "{}",
                serde_json::to_string(&fallback).unwrap_or_else(|_| {
                    "{\"ok\":false,\"processed\":[],\"skipped\":[],\"missing\":[],\"errors\":[{\"message\":\"unserializable fatal error\"}],\"logs\":[]}".to_string()
                })
            );
        }
    }
}