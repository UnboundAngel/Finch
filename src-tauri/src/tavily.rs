use serde::{Deserialize, Serialize};
use reqwest::Client;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TavilyResult {
    pub title: String,
    pub url: String,
    pub content: String,
    pub score: f32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TavilyResponse {
    pub results: Vec<TavilyResult>,
    pub query: String,
    pub response_time: f32,
}

#[derive(Debug, Clone)]
pub struct TavilyClient {
    api_key: String,
    client: Client,
}

impl TavilyClient {
    pub fn new(api_key: String) -> Self {
        Self {
            api_key,
            client: Client::new(),
        }
    }

    pub async fn search(&self, query: &str) -> Result<TavilyResponse, String> {
        let body = serde_json::json!({
            "api_key": self.api_key,
            "query": query,
            "search_depth": "basic",
            "max_results": 5,
            "include_answer": false,
            "include_raw_content": false,
            "include_images": false
        });

        let resp = self.client.post("https://api.tavily.com/search")
            .json(&body)
            .send()
            .await
            .map_err(|e| format!("Tavily request failed: {}", e))?;

        if !resp.status().is_success() {
            let status = resp.status();
            let err_body = resp.text().await.unwrap_or_default();
            return Err(format!("Tavily API error ({}): {}", status, err_body));
        }

        let data: TavilyResponse = resp.json().await
            .map_err(|e| format!("Failed to parse Tavily response: {}", e))?;

        Ok(data)
    }

    /// Formats the search results into a concise string for the LLM to process.
    pub fn format_results(response: &TavilyResponse) -> String {
        let mut formatted = format!("Search Results for '{}':\n\n", response.query);
        for (i, result) in response.results.iter().enumerate() {
            formatted.push_str(&format!("[{}] {} ({})\n", i + 1, result.title, result.url));
            formatted.push_str(&format!("Content: {}\n\n", result.content));
        }
        formatted
    }
}
