#!/usr/bin/env node

const https = require('https');
const readline = require('readline');

// Supported providers and their API configurations
const PROVIDERS = {
  'supabase': {
    name: 'Supabase',
    baseUrl: 'https://api.supabase.com/v1',
    authHeader: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    getUrls: async (apiKey, projectId) => {
      const url = `https://api.supabase.com/v1/projects/${projectId}/config/database`;
      const response = await makeRequest(url, {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      });
      
      const host = response.host;
      const port = response.port || 5432;
      const database = response.db_name;
      const user = response.db_user;
      const password = response.db_password;
      
      return {
        pooled: `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=require&pgbouncer=true`,
        direct: `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=require`
      };
    }
  },
  'neon': {
    name: 'Neon',
    baseUrl: 'https://console.neon.tech/api/v2',
    authHeader: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    getUrls: async (apiKey, projectId) => {
      const url = `https://console.neon.tech/api/v2/projects/${projectId}/connection_uri`;
      const response = await makeRequest(url, {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      });
      
      // Neon provides both pooled and direct connection strings
      return {
        pooled: response.uri + '?sslmode=require&pgbouncer=true',
        direct: response.uri.replace('?pooler=true', '') + '?sslmode=require'
      };
    }
  },
  'planetscale': {
    name: 'PlanetScale',
    baseUrl: 'https://api.planetscale.com/v1',
    authHeader: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    getUrls: async (apiKey, databaseId) => {
      const [org, database] = databaseId.split('/');
      const url = `https://api.planetscale.com/v1/organizations/${org}/databases/${database}/branches/main/connection-strings`;
      const response = await makeRequest(url, {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      });
      
      // PlanetScale uses MySQL, but if they support PostgreSQL
      throw new Error('PlanetScale primarily uses MySQL. For PostgreSQL, consider Supabase, Neon, or Railway.');
    }
  },
  'railway': {
    name: 'Railway',
    baseUrl: 'https://backboard.railway.app/graphql',
    authHeader: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    getUrls: async (apiKey, projectId) => {
      const query = `
        query GetProject($projectId: String!) {
          project(id: $projectId) {
            services {
              edges {
                node {
                  name
                  serviceInstances {
                    edges {
                      node {
                        environmentId
                        domains {
                          serviceDomain
                        }
                      }
                    }
                  }
                }
              }
            }
            environments {
              edges {
                node {
                  id
                  name
                  variables {
                    edges {
                      node {
                        name
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `;
      
      const response = await makeGraphQLRequest('https://backboard.railway.app/graphql', {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }, { query, variables: { projectId } });
      
      // Extract DATABASE_URL from environment variables
      const env = response.data.project.environments.edges[0].node;
      const dbUrl = env.variables.edges.find(v => v.node.name === 'DATABASE_URL')?.node.value;
      
      if (!dbUrl) {
        throw new Error('DATABASE_URL not found in Railway project');
      }
      
      return {
        pooled: dbUrl + '?sslmode=require&pgbouncer=true',
        direct: dbUrl + '?sslmode=require'
      };
    }
  },
  'vercel-postgres': {
    name: 'Vercel Postgres',
    baseUrl: 'https://api.vercel.com/v1',
    authHeader: (apiKey) => ({ 'Authorization': `Bearer ${apiKey}` }),
    getUrls: async (apiKey, databaseId) => {
      // For Vercel Postgres, the connection strings are typically in environment variables
      const url = `https://api.vercel.com/v1/storage/postgres/${databaseId}`;
      const response = await makeRequest(url, {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      });
      
      return {
        pooled: response.pooled_connection_string || (response.connection_string + '?sslmode=require&pgbouncer=true'),
        direct: response.direct_connection_string || (response.connection_string + '?sslmode=require')
      };
    }
  },
  'aws-rds': {
    name: 'AWS RDS',
    getUrls: async (apiKey, dbIdentifier) => {
      throw new Error('AWS RDS requires AWS SDK and more complex setup. Please use AWS Console to get connection strings.');
    }
  }
};

// Helper function to make HTTP requests
function makeRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Georgia-Probate-Monitor/1.0.0',
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Helper function for GraphQL requests
function makeGraphQLRequest(url, headers = {}, body = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'User-Agent': 'Georgia-Probate-Monitor/1.0.0',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          } else {
            resolve(JSON.parse(data));
          }
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('🐘 PostgreSQL Connection String Retriever');
  console.log('==========================================\n');
  
  console.log('Supported providers:');
  Object.keys(PROVIDERS).forEach((key, index) => {
    console.log(`  ${index + 1}. ${PROVIDERS[key].name} (${key})`);
  });
  console.log('');

  try {
    // Get provider
    const providerInput = await askQuestion('Enter your database provider (e.g., supabase, neon, railway, vercel-postgres): ');
    const provider = PROVIDERS[providerInput.toLowerCase().trim()];
    
    if (!provider) {
      throw new Error(`Unsupported provider: ${providerInput}. Supported: ${Object.keys(PROVIDERS).join(', ')}`);
    }

    console.log(`\nUsing ${provider.name}...\n`);

    // Get API key
    const apiKey = await askQuestion('Enter your API key: ');
    if (!apiKey.trim()) {
      throw new Error('API key is required');
    }

    // Get database/project ID
    const dbIdLabel = providerInput.includes('vercel') ? 'database ID' : 
                     providerInput.includes('railway') ? 'project ID' : 
                     'project/database ID';
    
    const databaseId = await askQuestion(`Enter your ${dbIdLabel}: `);
    if (!databaseId.trim()) {
      throw new Error('Database/Project ID is required');
    }

    console.log('\n🔍 Fetching connection strings...\n');

    // Fetch URLs
    const urls = await provider.getUrls(apiKey.trim(), databaseId.trim());

    // Display results
    console.log('✅ SUCCESS! Copy these to Vercel Project Settings → Environment Variables:\n');
    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│                           DATABASE_URL (Pooled)                    │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log(`│ ${urls.pooled.padEnd(67)} │`);
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');
    
    console.log('┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│                           DIRECT_URL (Non-pooled)                  │');
    console.log('├─────────────────────────────────────────────────────────────────────┤');
    console.log(`│ ${urls.direct.padEnd(67)} │`);
    console.log('└─────────────────────────────────────────────────────────────────────┘\n');

    console.log('📋 Copy/paste instructions:');
    console.log('1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
    console.log('2. Add DATABASE_URL with the pooled connection string');
    console.log('3. Add DIRECT_URL with the non-pooled connection string');
    console.log('4. Redeploy with "Clear build cache" enabled\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403')) {
      console.error('💡 Check your API key permissions and expiry');
    } else if (error.message.includes('HTTP 404')) {
      console.error('💡 Check your project/database ID is correct');
    }
    
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log('\n\n👋 Script cancelled by user');
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  console.error('❌ Unexpected error:', error.message);
  process.exit(1);
});