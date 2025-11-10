// Test what the AI agent and fallback generate for different queries

const testQueries = [
  "Find cybersecurity experts",
  "Healthcare startup founders",
  "AI researchers at universities",
  "former Adobe product managers",
  "consultants from Deloitte"
];

const fillerWords = ['interviews', 'with', 'customers', 'of', 'the', 'and', 'or', 'about', 'for', 'in', 'on', 'at', 'to', 'from', 'all', 'find', 'search', 'please', 'me', 'that', 'this', 'what', 'how', 'why', 'software', 'process'];

testQueries.forEach(query => {
  const queryLower = query.toLowerCase();
  let companies = [];
  let roleKeywords = [];
  
  // Simulate the fallback logic
  if (queryLower.includes('big 5') || queryLower.includes('executive search firm')) {
    companies = ['Korn Ferry', 'Russell Reynolds', 'Heidrick & Struggles'];
    roleKeywords = ['Partner', 'Principal', 'Director'];
  } else if (queryLower.includes('consulting') || queryLower.includes('deloitte') || queryLower.includes('mckinsey')) {
    companies = ['McKinsey', 'Bain', 'BCG', 'Deloitte'];
    roleKeywords = ['Partner', 'Principal', 'Director'];
  } else if (queryLower.includes('cdw') || queryLower.includes('shi') || queryLower.includes('insight enterprises')) {
    companies = ['CDW', 'SHI', 'Insight Enterprises'];
    roleKeywords = ['VP', 'Director', 'Manager'];
  } else if (queryLower.includes('fintech')) {
    companies = ['Stripe', 'Square', 'PayPal'];
    roleKeywords = ['VP', 'Director'];
  } else if (queryLower.includes('tech') || queryLower.includes('google') || queryLower.includes('microsoft')) {
    companies = ['Google', 'Microsoft', 'Meta'];
    roleKeywords = ['VP', 'Director', 'Engineering'];
  } else {
    // Generic fallback
    roleKeywords = query.split(' ').filter(word => word.length > 2);
    console.log(`⚠️  GENERIC FALLBACK TRIGGERED`);
  }
  
  console.log(`Query: "${query}"`);
  console.log(`  Companies: [${companies.join(', ')}]`);
  console.log(`  Roles: [${roleKeywords.join(', ')}]`);
  console.log('');
});
