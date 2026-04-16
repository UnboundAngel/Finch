use serde::{Deserialize, Serialize};
use reqwest::Client;
use std::time::Instant;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SearchResult {
    pub title: String,
    pub url: String,
    pub snippet: String,
    pub duration_ms: u64,
}

pub enum SearchProvider {
    Tavily(String),
    Brave(String),
    SearXNG(String),
}

pub async fn execute_search(
    provider: SearchProvider,
    query: &str,
    on_found: impl Fn(SearchResult),
) -> Result<String, String> {
    let client = Client::new();
    let mut results = Vec::new();

    match provider {
        SearchProvider::Tavily(api_key) => {
            let start = Instant::now();
            let resp = client.post("https://api.tavily.com/search")
                .json(&serde_json::json!({
                    "api_key": api_key,
                    "query": query,
                    "search_depth": "basic",
                    "max_results": 5
                }))
                .send()
                .await
                .map_err(|e| format!("Tavily request failed: {}", e))?;

            let data: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse Tavily JSON: {}", e))?;
            
            if let Some(hits) = data["results"].as_array() {
                for hit in hits {
                    let res = SearchResult {
                        title: hit["title"].as_str().unwrap_or("Untitled").to_string(),
                        url: hit["url"].as_str().unwrap_or("").to_string(),
                        snippet: hit["content"].as_str().unwrap_or("").to_string(),
                        duration_ms: start.elapsed().as_millis() as u64,
                    };
                    results.push(res.clone());
                    on_found(res);
                }
            }
        },
        SearchProvider::Brave(api_key) => {
            let start = Instant::now();
            let resp = client.get("https://api.search.brave.com/res/v1/web/search")
                .query(&[("q", query), ("count", "5")])
                .header("Accept", "application/json")
                .header("X-Subscription-Token", api_key)
                .send()
                .await
                .map_err(|e| format!("Brave request failed: {}", e))?;

            let data: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse Brave JSON: {}", e))?;
            
            if let Some(hits) = data["web"]["results"].as_array() {
                for hit in hits {
                    let res = SearchResult {
                        title: hit["title"].as_str().unwrap_or("Untitled").to_string(),
                        url: hit["url"].as_str().unwrap_or("").to_string(),
                        snippet: hit["description"].as_str().unwrap_or("").to_string(),
                        duration_ms: start.elapsed().as_millis() as u64,
                    };
                    results.push(res.clone());
                    on_found(res);
                }
            }
        },
        SearchProvider::SearXNG(url) => {
            let start = Instant::now();
            // Ensure URL has /search and format=json
            let base_url = url.trim_end_matches('/');
            let search_url = if base_url.contains("/search") {
                format!("{}&format=json&q={}", base_url, query)
            } else {
                format!("{}/search?format=json&q={}", base_url, query)
            };

            let resp = client.get(search_url)
                .send()
                .await
                .map_err(|e| format!("SearXNG request failed: {}", e))?;

            let data: serde_json::Value = resp.json().await.map_err(|e| format!("Failed to parse SearXNG JSON: {}", e))?;
            
            if let Some(hits) = data["results"].as_array() {
                for hit in hits.iter().take(5) {
                    let res = SearchResult {
                        title: hit["title"].as_str().unwrap_or("Untitled").to_string(),
                        url: hit["url"].as_str().unwrap_or("").to_string(),
                        snippet: hit["content"].as_str().unwrap_or("").to_string(),
                        duration_ms: start.elapsed().as_millis() as u64,
                    };
                    results.push(res.clone());
                    on_found(res);
                }
            }
        }
    }

    // Synthesize the results into a context block for the LLM
    let mut context = String::from("\n[SEARCH RESULTS]\n");
    for (i, res) in results.iter().enumerate() {
        context.push_str(&format!("\nSource [{}]: {}\nURL: {}\nSnippet: {}\n", i + 1, res.title, res.url, res.snippet));
    }
    context.push_str("\n[END SEARCH RESULTS]\n");
    
    Ok(context)
}
