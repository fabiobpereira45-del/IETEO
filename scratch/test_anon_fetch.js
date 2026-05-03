
const fetch = require('node-fetch'); // If available, or use native fetch if node 18+

const supabaseUrl = 'https://plwqgvfbkjdnlzgljnef.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsd3FndmZia2pkbmx6Z2xqbmVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDUyMTIsImV4cCI6MjA4ODA4MTIxMn0.WJORz2Q3FbZG1dl7Y1NMSiMwDleVRryPSeXlo0kJdlI';

async function test() {
  const url = `${supabaseUrl}/rest/v1/assessments?select=*&order=created_at.desc`;
  console.log('Fetching from:', url);
  
  try {
    const res = await fetch(url, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    console.log('Status:', res.status);
    console.log('Status Text:', res.statusText);
    
    const text = await res.text();
    console.log('Response body:', text);
  } catch (err) {
    console.error('Fetch Error:', err);
  }
}

test();
