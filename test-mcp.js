#!/usr/bin/env node

/**
 * MCP Server Comprehensive Test Suite
 * Tests the MCP endpoint with diverse query patterns to validate performance
 */

const API_URL = 'https://expert-platform-mcp-1.onrender.com/mcp';

class MCPTester {
  constructor() {
    this.results = [];
    this.testId = 1;
  }

  async callMCP(method, params = {}) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: this.testId++,
          method,
          params
        })
      });

      const data = await response.json();
      const elapsed = Date.now() - startTime;

      return { success: true, data, elapsed };
    } catch (error) {
      const elapsed = Date.now() - startTime;
      return { success: false, error: error.message, elapsed };
    }
  }

  logResult(testName, query, result, expected = {}) {
    const passed = result.success && (!expected.minResults || this.getResultCount(result.data) >= expected.minResults);
    const resultCount = this.getResultCount(result.data);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${testName}`);
    console.log(`  Query: "${query}"`);
    console.log(`  Results: ${resultCount} | Time: ${result.elapsed}ms`);
    
    if (!passed && expected.minResults) {
      console.log(`  Expected: >= ${expected.minResults} results`);
    }
    
    if (!result.success) {
      console.log(`  Error: ${result.error}`);
    }

    this.results.push({
      testName,
      query,
      passed,
      resultCount,
      elapsed: result.elapsed,
      expected: expected.minResults || 0,
      success: result.success
    });

    console.log('');
  }

  getResultCount(data) {
    try {
      if (data.result?.content?.[0]?.text) {
        const parsed = JSON.parse(data.result.content[0].text);
        return parsed.total_results || parsed.experts?.length || parsed.interviews?.length || 0;
      }
    } catch (e) {
      return 0;
    }
    return 0;
  }

  async testInitialize() {
    console.log('\n=== TEST 1: MCP HANDSHAKE ===\n');
    
    const result = await this.callMCP('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'Test Suite', version: '1.0.0' }
    });

    this.logResult('Initialize Handshake', 'N/A', result);
    return result.success;
  }

  async testToolsList() {
    console.log('\n=== TEST 2: TOOL DISCOVERY ===\n');
    
    const result = await this.callMCP('tools/list');
    
    if (result.success) {
      const tools = result.data.result?.tools || [];
      console.log(`✅ Found ${tools.length} tools:`);
      tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description.substring(0, 80)}...`);
      });
      console.log('');
    }

    this.logResult('Tool Discovery', 'N/A', result);
  }

  async testExpertSearchPatterns() {
    console.log('\n=== TEST 3: EXPERT SEARCH PATTERNS ===\n');

    const expertTests = [
      // Known working patterns
      { query: 'Big 5 search firms', minResults: 5, description: 'Big 5 pattern detection' },
      { query: 'executives from Korn Ferry', minResults: 3, description: 'Specific company' },
      { query: 'engineering at Google', minResults: 2, description: 'Role + company' },
      
      // Cybersecurity multi-company searches
      { query: 'cybersecurity experts from Palo Alto Networks, CrowdStrike, or Fortinet', minResults: 0, description: 'Multi-company cybersecurity' },
      { query: 'security leaders at Okta, Duo, or Auth0', minResults: 0, description: 'Identity security companies' },
      { query: 'experts from EASM vendors: Rapid7, Intruder, CyCognito, Censys', minResults: 0, description: 'EASM vendor experts' },
      { query: 'cybersecurity executives at Microsoft, Google, or Amazon', minResults: 1, description: 'Big tech security' },
      
      // Multiple role type searches
      { query: 'SRE, DevOps, or Platform engineers', minResults: 0, description: 'Multiple engineering roles' },
      { query: 'CIOs, CTOs, or VPs of Engineering', minResults: 0, description: 'Multiple exec roles' },
      { query: 'Site Reliability Engineers or DevOps leads', minResults: 0, description: 'SRE/DevOps specialists' },
      { query: 'Security architects, CISOs, or security directors', minResults: 0, description: 'Security leadership roles' },
      
      // Complex combined searches
      { query: 'former CISOs from enterprise software companies', minResults: 0, description: 'Former security execs' },
      { query: 'current or former engineering VPs at cloud providers', minResults: 1, description: 'Cloud eng leadership' },
      { query: 'DevOps or SRE experts who worked at Netflix, Uber, or Airbnb', minResults: 0, description: 'Scale company SREs' },
    ];

    for (const test of expertTests) {
      const result = await this.callMCP('tools/call', {
        name: 'search_experts',
        arguments: { query: test.query, limit: 10 }
      });

      this.logResult(`Expert: ${test.description}`, test.query, result, { minResults: test.minResults });
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }
  }

  async testInsightSearchPatterns() {
    console.log('\n=== TEST 4: INSIGHT SEARCH PATTERNS ===\n');

    const insightTests = [
      // Known working
      { query: 'vendor consolidation', minResults: 1, description: 'Direct term match' },
      { query: 'budget allocation', minResults: 0, description: 'Business topic' },
      { query: 'executive search', minResults: 0, description: 'Industry topic' },
      
      // Photography software customer feedback series
      { query: 'What do customers think about Adobe Photoshop', minResults: 0, description: 'Adobe Photoshop feedback' },
      { query: 'customer satisfaction with Capture One', minResults: 0, description: 'Capture One satisfaction' },
      { query: 'user feedback on Lightroom vs Capture One', minResults: 0, description: 'Lightroom comparison' },
      { query: 'photography software pricing complaints', minResults: 0, description: 'Photo software pricing' },
      { query: 'Adobe Creative Cloud subscription feedback', minResults: 0, description: 'Adobe subscription model' },
      { query: 'professional photographer software preferences', minResults: 0, description: 'Photographer preferences' },
      { query: 'RAW processing software performance issues', minResults: 0, description: 'RAW processing feedback' },
      
      // Customer feedback patterns
      { query: 'NPS scores for photography software', minResults: 0, description: 'NPS metrics' },
      { query: 'customer churn reasons for Adobe products', minResults: 0, description: 'Churn analysis' },
      { query: 'feature requests from professional photographers', minResults: 0, description: 'Feature requests' },
      
      // Competitive landscape questions
      { query: 'competitive positioning of Adobe vs Capture One', minResults: 0, description: 'Competitive positioning' },
      { query: 'market share trends in photo editing software', minResults: 0, description: 'Market share trends' },
      { query: 'differentiation between leading photo software providers', minResults: 0, description: 'Product differentiation' },
      
      // Investment diligence questions
      { query: 'competitive dynamics', minResults: 0, description: 'Competitive analysis' },
      { query: 'pricing strategy', minResults: 0, description: 'Pricing decisions' },
      { query: 'market trends', minResults: 0, description: 'Market analysis' },
      
      // Decision-making queries
      { query: 'insourcing outsourcing', minResults: 1, description: 'Sourcing decisions' },
      { query: 'vendor selection', minResults: 1, description: 'Vendor decisions' },
      { query: 'build vs buy decisions', minResults: 0, description: 'Build/buy decisions' },
    ];

    for (const test of insightTests) {
      const result = await this.callMCP('tools/call', {
        name: 'search_insights',
        arguments: { query: test.query, limit: 5 }
      });

      this.logResult(`Insight: ${test.description}`, test.query, result, { minResults: test.minResults });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async testFullWorkflow() {
    console.log('\n=== TEST 5: FULL WORKFLOW ===\n');

    // Test 5.1: Find experts
    console.log('Step 1: Find Big 5 experts...');
    const expertsResult = await this.callMCP('tools/call', {
      name: 'search_experts',
      arguments: { query: 'Big 5 search firms', limit: 3 }
    });

    if (expertsResult.success) {
      try {
        const data = JSON.parse(expertsResult.data.result.content[0].text);
        if (data.experts && data.experts.length > 0) {
          const expertId = data.experts[0].id;
          const expertName = data.experts[0].full_name;
          
          console.log(`✅ Found expert: ${expertName} (${expertId})`);
          
          // Test 5.2: Get their profile
          console.log(`\nStep 2: Fetch profile for ${expertName}...`);
          const profileResult = await this.callMCP('tools/call', {
            name: 'fetch_profile',
            arguments: { expertId }
          });
          
          this.logResult('Fetch Profile Workflow', expertName, profileResult);
        }
      } catch (e) {
        console.log(`❌ Failed to parse expert results: ${e.message}\n`);
      }
    }

    // Test 5.3: Generate questions
    console.log('Step 3: Generate interview questions...');
    const questionsResult = await this.callMCP('tools/call', {
      name: 'generate_questions',
      arguments: { topic: 'executive search trends', questionCount: 5 }
    });

    this.logResult('Generate Questions Workflow', 'executive search trends', questionsResult);

    // Test 5.4: Get full interview
    console.log('Step 4: Get complete interview transcript...');
    const interviewResult = await this.callMCP('tools/call', {
      name: 'get_full_interview',
      arguments: { meetingId: '98302656417' }
    });

    this.logResult('Full Interview Workflow', 'meeting 98302656417', interviewResult);
  }

  async testPerformance() {
    console.log('\n=== TEST 6: PERFORMANCE BENCHMARKING ===\n');

    const perfTests = [
      { tool: 'search_insights', args: { query: 'vendor', limit: 10 }, name: 'Insights search' },
      { tool: 'search_experts', args: { query: 'Big 5', limit: 10 }, name: 'Expert search (fallback)' },
      { tool: 'search_experts', args: { query: 'Google engineering', limit: 10 }, name: 'Expert search (AI)' },
      { tool: 'generate_questions', args: { topic: 'AI trends', questionCount: 5 }, name: 'Question generation' },
    ];

    for (const test of perfTests) {
      const result = await this.callMCP('tools/call', {
        name: test.tool,
        arguments: test.args
      });

      const status = result.elapsed < 1000 ? '✅' : result.elapsed < 3000 ? '⚠️' : '❌';
      console.log(`${status} ${test.name}: ${result.elapsed}ms`);
    }
    console.log('');
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('DIAGNOSTIC REPORT SUMMARY');
    console.log('='.repeat(60));

    const totalTests = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = totalTests - passed;

    console.log(`\nTotal Tests: ${totalTests}`);
    console.log(`Passed: ${passed} (${(passed/totalTests*100).toFixed(1)}%)`);
    console.log(`Failed: ${failed} (${(failed/totalTests*100).toFixed(1)}%)`);

    // Performance stats
    const avgTime = this.results.reduce((sum, r) => sum + r.elapsed, 0) / totalTests;
    const maxTime = Math.max(...this.results.map(r => r.elapsed));
    
    console.log(`\nPerformance:`);
    console.log(`  Average: ${avgTime.toFixed(0)}ms`);
    console.log(`  Max: ${maxTime}ms`);

    // Failed tests
    if (failed > 0) {
      console.log(`\nFailed Tests:`);
      this.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.testName}: "${r.query}"`);
        console.log(`    Got ${r.resultCount} results, expected >= ${r.expected}`);
      });
    }

    // Success rate by category
    const categories = {};
    this.results.forEach(r => {
      const category = r.testName.split(':')[0];
      if (!categories[category]) {
        categories[category] = { total: 0, passed: 0 };
      }
      categories[category].total++;
      if (r.passed) categories[category].passed++;
    });

    console.log(`\nSuccess Rate by Category:`);
    Object.entries(categories).forEach(([cat, stats]) => {
      const rate = (stats.passed / stats.total * 100).toFixed(0);
      console.log(`  ${cat}: ${stats.passed}/${stats.total} (${rate}%)`);
    });

    // Recommendations
    console.log('\n' + '='.repeat(60));
    console.log('RECOMMENDATIONS');
    console.log('='.repeat(60));

    if (failed > 0) {
      console.log('\nBased on test results:');
      
      const expertFails = this.results.filter(r => r.testName.includes('Expert') && !r.passed);
      const insightFails = this.results.filter(r => r.testName.includes('Insight') && !r.passed);

      if (expertFails.length > 0) {
        console.log('\n1. Expert Search Issues:');
        console.log('   - Add more fallback patterns for failing queries');
        console.log('   - Verify AI agent is generating correct company/role combinations');
        console.log('   - Consider expanding company name variations');
      }

      if (insightFails.length > 0) {
        console.log('\n2. Insight Search Issues:');
        console.log('   - Review search terms being used');
        console.log('   - Confirm database has relevant interview content');
        console.log('   - Consider adding synonym matching');
      }

      const slowTests = this.results.filter(r => r.elapsed > 2000);
      if (slowTests.length > 0) {
        console.log('\n3. Performance Issues:');
        console.log('   - AI agent calls taking too long');
        console.log('   - Consider caching AI agent results');
        console.log('   - Use fallback more aggressively');
      }
    } else {
      console.log('\n🎉 All tests passed! System is working well.');
    }

    // Save detailed results
    const { writeFileSync } = await import('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `test-results-${timestamp}.json`;
    
    writeFileSync(filename, JSON.stringify({
      summary: {
        total: totalTests,
        passed,
        failed,
        avgTime: avgTime.toFixed(0),
        maxTime,
        timestamp: new Date().toISOString()
      },
      results: this.results
    }, null, 2));

    console.log(`\n📄 Detailed results saved to: ${filename}`);
  }

  async runAllTests() {
    console.log('🧪 Starting MCP Server Diagnostic Tests...');
    console.log('='.repeat(60));
    console.log(`API: ${API_URL}`);
    console.log(`Start Time: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
      // Run all test suites
      await this.testInitialize();
      await this.testToolsList();
      await this.testExpertSearchPatterns();
      await this.testInsightSearchPatterns();
      await this.testFullWorkflow();
      await this.testPerformance();

      // Generate final report
      this.generateReport();

    } catch (error) {
      console.error('\n❌ Test suite failed:', error);
    }
  }
}

// Run tests
const tester = new MCPTester();
tester.runAllTests().catch(console.error);

