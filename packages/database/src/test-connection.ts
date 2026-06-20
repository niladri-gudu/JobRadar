import { db } from './index';

async function test() {
  console.log('Testing connection to PostgreSQL database...');
  
  // Insert a test company
  const company = await db.company.create({
    data: {
      name: 'Acme Corp',
      website: 'https://acme.example.com',
      normalizedDomain: 'acme.example.com',
      industry: 'Technology',
      source: 'manual',
    },
  });
  
  console.log('Inserted test company:', company);
  
  // Query the company
  const retrieved = await db.company.findUnique({
    where: { id: company.id },
  });
  
  console.log('Retrieved company:', retrieved);
  
  // Clean up
  await db.company.delete({
    where: { id: company.id },
  });
  
  console.log('Connection test completed successfully!');
}

test()
  .catch((err) => {
    console.error('Connection test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
