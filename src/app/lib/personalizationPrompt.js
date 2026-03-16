/**
 * Personalization Prompt Builder (Step 1 LLM)
 * Generates prompts for LLM to extract retailer business intelligence
 * Returns config data ONLY (no agent prompt - that's Step 2)
 */

export function buildPersonalizationPrompt(retailerName) {
  return `You are a retail intelligence expert. Analyze the retailer "${retailerName}" and generate demo configuration.

**Your Task:**
Provide a JSON response with business intelligence about this retailer.

**Important: The "vertical" field MUST be one of these exact values:**
- "pharmacy" (for drugstores, pharmacies, health/wellness stores)
- "grocery" (for supermarkets, grocery stores, food retailers)
- "sporting_goods" (for sports equipment, outdoor gear, athletic stores)
- "beauty" (for cosmetics, beauty products, makeup stores)
- "apparel" (for clothing, fashion, footwear stores)
- "general_retail" (for any other retail not fitting above categories)

**Response Format (JSON only, no markdown):**
{
  "retailer_name": "${retailerName}",
  "vertical": "grocery",
  "display_name": "Kroger Store Intelligence",
  "tagline": "AI-powered insights for grocery operations",
  "brand_colors": {
    "primary": "#003d7a",
    "secondary": "#cc0000"
  },
  "business_challenges": [
    "Perishable inventory management and shrink reduction",
    "Fresh food waste prevention and quality control",
    "Rapid inventory turnover for produce and dairy",
    "Competitive pricing pressure and margin optimization"
  ],
  "primary_kpi": {
    "name": "in_stock_rate",
    "display_name": "In-Stock Rate",
    "targets": {
      "optimal": 95,
      "attention": 90,
      "priority": 85
    },
    "description": "Percentage of expected items available on shelf"
  },
  "secondary_kpi": {
    "name": "shrink_rate",
    "display_name": "Shrink Rate",
    "target": 2.0,
    "description": "Percentage of inventory lost to spoilage or waste"
  },
  "categories": [
    {
      "id": "produce",
      "display_name": "Produce",
      "dos_target": 3,
      "performance_target": 95,
      "priority": "critical",
      "seasonality": "high"
    },
    {
      "id": "meat_seafood",
      "display_name": "Meat & Seafood",
      "dos_target": 2,
      "performance_target": 93,
      "priority": "critical",
      "seasonality": "medium"
    },
    {
      "id": "bakery",
      "display_name": "Bakery",
      "dos_target": 2,
      "performance_target": 92,
      "priority": "high",
      "seasonality": "low"
    },
    {
      "id": "dairy",
      "display_name": "Dairy",
      "dos_target": 5,
      "performance_target": 94,
      "priority": "high",
      "seasonality": "low"
    },
    {
      "id": "dry_goods",
      "display_name": "Dry Goods",
      "dos_target": 30,
      "performance_target": 90,
      "priority": "medium",
      "seasonality": "low"
    }
  ]
}

**Guidelines:**
- Use actual knowledge about the retailer's business model
- If retailer has well-known brand colors, include them in hex format
- Primary color should be the retailer's main brand color
- Secondary color should be an accent/complementary color
- If brand colors unknown, omit the brand_colors field (wizard will use defaults)
- Choose appropriate targets based on industry standards
- Categories must be specific to the retailer (not "Category 1")
- Business challenges should reflect the retailer's unique operational issues
- DOS targets should match product perishability
- If retailer is unknown, make educated guesses based on name/industry
- DO NOT include agent_prompt in this response (handled separately)
- For French retailers, use French-language retail terminology when appropriate (e.g., hypermarché, grande surface, DLC/DLUO for expiry dates)`;
}

