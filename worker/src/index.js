const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5-20250929'
const MAX_INPUT_CHARS = 4000

const SYSTEM_PROMPT = `You are a tech news summarizer for GloSignal. Given an article's title and text, generate:
1. "summary": A crisp 1-2 sentence summary of the key news (what happened and why it matters)
2. "deepExtract": An array of 3-4 short paragraphs (2-3 sentences each) covering the most important details, implications, and context

Be direct and informative. No filler phrases like "In a move that..." or "This comes as...". Lead with the news.

Respond ONLY with valid JSON: { "summary": "...", "deepExtract": ["...", "...", "..."] }`

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  }
}

function jsonResponse(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
    }
  })
}

function extractJSON(text) {
  try { return JSON.parse(text) } catch {}
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (match) try { return JSON.parse(match[1]) } catch {}
  return null
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '*'

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(origin) })
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin)
    }

    try {
      const { text, title } = await request.json()
      if (!text || !title) {
        return jsonResponse({ error: 'Missing text or title' }, 400, origin)
      }

      const truncatedText = text.substring(0, MAX_INPUT_CHARS)

      const response = await fetch(ANTHROPIC_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 512,
          system: SYSTEM_PROMPT,
          messages: [{
            role: 'user',
            content: `Title: ${title}\n\nArticle text:\n${truncatedText}`
          }]
        })
      })

      if (!response.ok) {
        const err = await response.text()
        return jsonResponse({ error: 'AI API error', detail: err }, 502, origin)
      }

      const data = await response.json()
      const content = data.content?.[0]?.text || ''
      const parsed = extractJSON(content)

      if (!parsed || !parsed.summary || !parsed.deepExtract) {
        return jsonResponse({ error: 'Failed to parse AI response' }, 502, origin)
      }

      return jsonResponse(parsed, 200, origin)
    } catch (err) {
      return jsonResponse({ error: err.message }, 500, origin)
    }
  }
}
