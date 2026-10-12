use std::io::{self, Read};

use anyhow::{anyhow, Context, Result};

use crate::extract_parse::run_extract_parse;
use crate::protocol::{HelperRequest, HelperResponse};
use crate::rebuild_reinject::run_rebuild_reinject;
use crate::package::run_package;

pub fn run_from_stdin() -> Result<HelperResponse> {
    let mut input = String::new();

    io::stdin()
        .read_to_string(&mut input)
        .context("Failed to read helper request from stdin")?;

    let request: HelperRequest =
        serde_json::from_str(&input).context("Failed to deserialize helper request")?;

    run_request(request)
}

pub fn run_request(request: HelperRequest) -> Result<HelperResponse> {
    match request.command.as_str() {
        "extract-parse" => run_extract_parse(request),
        "rebuild-reinject" => run_rebuild_reinject(request),
        "package" => run_package(request),
        other => Err(anyhow!("Unknown helper command: {other}")),
    }
}