use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetRequest {
    pub kind: String,          // "bbs" | "col"
    pub source_type: String,   // "bbs-main" | "bbs-ef" | "col"
    pub source_uasset: String,
    pub source_uexp: String,

    /// Visible/editable output:
    /// - BBS => .bbs
    /// - COL => .json
    pub output_file: String,

    /// Raw extracted BBScript output (BBS only)
    pub bbscript_output_file: Option<String>,

    /// Raw extracted COL PAC output (COL only)
    pub pac_output_file: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HelperRequest {
    pub command: String,
    pub project_root: String,
    pub uassets_root: String,
    pub bbs_root: Option<String>,
    pub packages_root: Option<String>,
    pub ron_path: Option<String>,
    pub overwrite_project_files: Option<bool>,
    pub package_name: Option<String>,
    pub assets: Option<Vec<AssetRequest>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessedItem {
    pub source: Option<String>,
    pub output: Option<String>,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkippedItem {
    pub source: Option<String>,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MissingItem {
    pub source: Option<String>,
    pub expected: Option<String>,
    pub kind: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HelperErrorItem {
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HelperResponse {
    pub ok: bool,
    pub processed: Vec<ProcessedItem>,
    pub skipped: Vec<SkippedItem>,
    pub missing: Vec<MissingItem>,
    pub errors: Vec<HelperErrorItem>,
    pub logs: Vec<String>,
}

impl HelperResponse {
    pub fn ok() -> Self {
        Self {
            ok: true,
            processed: Vec::new(),
            skipped: Vec::new(),
            missing: Vec::new(),
            errors: Vec::new(),
            logs: Vec::new(),
        }
    }

    pub fn fatal(message: String) -> Self {
        Self {
            ok: false,
            processed: Vec::new(),
            skipped: Vec::new(),
            missing: Vec::new(),
            errors: vec![HelperErrorItem { message }],
            logs: Vec::new(),
        }
    }
}