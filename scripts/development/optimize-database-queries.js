#!/usr/bin/env node

/**
 * Database Query Optimization Script
 * Analyzes and optimizes database queries for better performance
 */

const fs = require('fs');
const path = require('path');

// Common N+1 query patterns to detect
const N_PLUS_ONE_PATTERNS = [
  // Prisma patterns
  {
    pattern: /\.findMany\([^)]*\)\.then\([^)]*=>\s*Promise\.all\([^)]*\.map\([^)]*=>\s*[^)]*\.findUnique\(/g,
    description: 'N+1 query in Prisma with findMany + findUnique',
    severity: 'high'
  },
  {
    pattern: /\.findMany\([^)]*\)\.then\([^)]*=>\s*Promise\.all\([^)]*\.map\([^)]*=>\s*[^)]*\.findFirst\(/g,
    description: 'N+1 query in Prisma with findMany + findFirst',
    severity: 'high'
  },
  // Raw SQL patterns
  {
    pattern: /SELECT.*FROM.*WHERE.*id\s*=\s*\$\d+.*\n.*SELECT.*FROM.*WHERE.*id\s*IN\s*\(/g,
    description: 'N+1 query in raw SQL with multiple SELECT statements',
    severity: 'high'
  },
  // Sequelize patterns
  {
    pattern: /\.findAll\([^)]*\)\.then\([^)]*=>\s*Promise\.all\([^)]*\.map\([^)]*=>\s*[^)]*\.findByPk\(/g,
    description: 'N+1 query in Sequelize with findAll + findByPk',
    severity: 'high'
  }
];

// Missing index patterns
const MISSING_INDEX_PATTERNS = [
  {
    pattern: /WHERE.*\b(user_id|product_id|order_id|category_id)\b.*=.*\$\d+/g,
    description: 'Potential missing index on foreign key',
    severity: 'medium'
  },
  {
    pattern: /WHERE.*\b(created_at|updated_at)\b.*[<>]=.*\$\d+/g,
    description: 'Potential missing index on timestamp fields',
    severity: 'medium'
  },
  {
    pattern: /ORDER BY.*\b(name|title|email|status)\b/g,
    description: 'Potential missing index on ORDER BY fields',
    severity: 'medium'
  }
];

// Inefficient query patterns
const INEFFICIENT_PATTERNS = [
  {
    pattern: /SELECT \*/g,
    description: 'SELECT * instead of specific columns',
    severity: 'medium'
  },
  {
    pattern: /SELECT.*COUNT\(\*\).*FROM.*WHERE.*GROUP BY/g,
    description: 'COUNT(*) with GROUP BY might be inefficient',
    severity: 'low'
  },
  {
    pattern: /SELECT.*FROM.*WHERE.*LIKE.*%[^%]*%/g,
    description: 'LIKE with wildcards on both sides prevents index usage',
    severity: 'high'
  },
  {
    pattern: /SELECT.*FROM.*WHERE.*OR.*=/g,
    description: 'OR conditions might prevent index usage',
    severity: 'medium'
  }
];

// Database optimization recommendations
const OPTIMIZATION_RECOMMENDATIONS = {
  'N+1 Queries': {
    description: 'Replace N+1 queries with JOINs or batch operations',
    solutions: [
      'Use Prisma include for related data',
      'Use raw SQL with JOINs',
      'Implement batch loading with DataLoader',
      'Use eager loading in ORMs'
    ],
    example: `
// ❌ N+1 Query
const users = await prisma.user.findMany();
const usersWithPosts = await Promise.all(
  users.map(user => prisma.post.findMany({ where: { userId: user.id } }))
);

// ✅ Optimized with include
const usersWithPosts = await prisma.user.findMany({
  include: { posts: true }
});
    `
  },
  'Missing Indexes': {
    description: 'Add indexes for frequently queried fields',
    solutions: [
      'Add indexes on foreign keys',
      'Add composite indexes for multi-column queries',
      'Add indexes on ORDER BY fields',
      'Add indexes on WHERE clause fields'
    ],
    example: `
-- Add indexes for better performance
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_order_user_id ON orders(user_id);
CREATE INDEX idx_product_category_id ON products(category_id);
CREATE INDEX idx_created_at ON orders(created_at);
    `
  },
  'Inefficient Queries': {
    description: 'Optimize query structure and avoid common pitfalls',
    solutions: [
      'Select only needed columns instead of SELECT *',
      'Use LIMIT for pagination',
      'Avoid wildcards in LIKE queries',
      'Use EXISTS instead of IN for large datasets'
    ],
    example: `
-- ❌ Inefficient
SELECT * FROM users WHERE email LIKE '%@example.com';

-- ✅ Optimized
SELECT id, email, name FROM users WHERE email LIKE '@example.com%';
    `
  }
};

// Analyze file for query patterns
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    // Check for N+1 queries
    N_PLUS_ONE_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern.pattern);
      if (matches) {
        issues.push({
          type: 'N+1 Query',
          pattern: pattern.description,
          severity: pattern.severity,
          count: matches.length,
          lines: findLineNumbers(content, pattern.pattern)
        });
      }
    });
    
    // Check for missing indexes
    MISSING_INDEX_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern.pattern);
      if (matches) {
        issues.push({
          type: 'Missing Index',
          pattern: pattern.description,
          severity: pattern.severity,
          count: matches.length,
          lines: findLineNumbers(content, pattern.pattern)
        });
      }
    });
    
    // Check for inefficient queries
    INEFFICIENT_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern.pattern);
      if (matches) {
        issues.push({
          type: 'Inefficient Query',
          pattern: pattern.description,
          severity: pattern.severity,
          count: matches.length,
          lines: findLineNumbers(content, pattern.pattern)
        });
      }
    });
    
    return issues;
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return [];
  }
}

// Find line numbers for matches
function findLineNumbers(content, pattern) {
  const lines = content.split('\n');
  const lineNumbers = [];
  
  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      lineNumbers.push(index + 1);
    }
  });
  
  return lineNumbers;
}

// Generate optimization recommendations
function generateRecommendations(issues) {
  const recommendations = [];
  
  const issueTypes = [...new Set(issues.map(issue => issue.type))];
  
  issueTypes.forEach(type => {
    const typeIssues = issues.filter(issue => issue.type === type);
    const recommendation = OPTIMIZATION_RECOMMENDATIONS[type];
    
    if (recommendation) {
      recommendations.push({
        type,
        description: recommendation.description,
        solutions: recommendation.solutions,
        example: recommendation.example,
        count: typeIssues.length
      });
    }
  });
  
  return recommendations;
}

// Generate detailed report
function generateReport(analysisResults) {
  let report = '\n🔍 Database Query Optimization Report\n';
  report += '='.repeat(50) + '\n\n';
  
  let totalIssues = 0;
  let highSeverityIssues = 0;
  let mediumSeverityIssues = 0;
  let lowSeverityIssues = 0;
  
  Object.entries(analysisResults).forEach(([filePath, issues]) => {
    if (issues.length > 0) {
      report += `📁 ${filePath}\n`;
      report += `${'='.repeat(filePath.length + 4)}\n\n`;
      
      issues.forEach(issue => {
        const severityIcon = {
          'high': '🔴',
          'medium': '🟡',
          'low': '🟢'
        }[issue.severity] || '⚪';
        
        report += `${severityIcon} ${issue.type}: ${issue.pattern}\n`;
        report += `   Count: ${issue.count} occurrences\n`;
        report += `   Lines: ${issue.lines.join(', ')}\n\n`;
        
        totalIssues++;
        if (issue.severity === 'high') highSeverityIssues++;
        else if (issue.severity === 'medium') mediumSeverityIssues++;
        else lowSeverityIssues++;
      });
      
      report += '\n';
    }
  });
  
  // Summary
  report += `📊 Summary\n`;
  report += `${'='.repeat(20)}\n`;
  report += `Total issues found: ${totalIssues}\n`;
  report += `High severity: ${highSeverityIssues}\n`;
  report += `Medium severity: ${mediumSeverityIssues}\n`;
  report += `Low severity: ${lowSeverityIssues}\n\n`;
  
  // Recommendations
  const allIssues = Object.values(analysisResults).flat();
  const recommendations = generateRecommendations(allIssues);
  
  if (recommendations.length > 0) {
    report += `💡 Optimization Recommendations\n`;
    report += `${'='.repeat(35)}\n\n`;
    
    recommendations.forEach(rec => {
      report += `🔧 ${rec.type} (${rec.count} issues)\n`;
      report += `${rec.description}\n\n`;
      report += `Solutions:\n`;
      rec.solutions.forEach(solution => {
        report += `  • ${solution}\n`;
      });
      report += `\nExample:\n${rec.example}\n`;
      report += `${'-'.repeat(30)}\n\n`;
    });
  }
  
  return report;
}

// Main analysis function
function analyzeDatabaseQueries() {
  console.log('🔍 Starting database query analysis...\n');
  
  // Directories to analyze
  const directories = [
    'microservices',
    'libs/shared/src'
  ];
  
  const analysisResults = {};
  let totalFiles = 0;
  let filesWithIssues = 0;
  
  directories.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`📁 Analyzing ${dir}...`);
      
      const files = findFiles(dir, ['*.ts', '*.js'], [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/coverage/**',
        '**/*.test.*',
        '**/*.spec.*'
      ]);
      
      totalFiles += files.length;
      
      files.forEach(file => {
        const issues = analyzeFile(file);
        if (issues.length > 0) {
          analysisResults[file] = issues;
          filesWithIssues++;
        }
      });
    }
  });
  
  // Generate and display report
  const report = generateReport(analysisResults);
  console.log(report);
  
  // Save report to file
  const reportPath = path.join(process.cwd(), 'database-optimization-report.txt');
  fs.writeFileSync(reportPath, report, 'utf8');
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  
  console.log(`\n📈 Analysis Summary:`);
  console.log(`Files analyzed: ${totalFiles}`);
  console.log(`Files with issues: ${filesWithIssues}`);
  console.log(`Total issues found: ${Object.values(analysisResults).flat().length}`);
  
  return analysisResults;
}

// Helper function to find files
function findFiles(dir, patterns, excludes) {
  const files = [];
  
  function walk(currentPath) {
    if (excludes.some(pattern => currentPath.includes(pattern))) {
      return;
    }
    
    const stats = fs.statSync(currentPath);
    if (stats.isDirectory()) {
      const items = fs.readdirSync(currentPath);
      items.forEach(item => {
        walk(path.join(currentPath, item));
      });
    } else if (patterns.some(pattern => currentPath.endsWith(pattern.replace('*', '')))) {
      files.push(currentPath);
    }
  }
  
  walk(dir);
  return files;
}

// CLI interface
if (require.main === module) {
  analyzeDatabaseQueries();
}

module.exports = {
  analyzeDatabaseQueries,
  analyzeFile,
  generateRecommendations,
  generateReport
};