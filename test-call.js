#!/usr/bin/env node

(async () => {
  const base = 'https://localhost:3005';
  const listRes = await fetch(base + '/getPuppets');
  const names = await listRes.json();
  console.log('Available puppets:', names);
  const puppet = process.argv[2] || 'PrintifyFixMockups';
  const printifyURL =
    process.argv[3] ||
    'https://printify.com/app/product-details/685e63934c5f78ebfa00b1e5?fromProductsPage=1';
  if (!puppet) {
    console.error('No puppet available');
    process.exit(1);
  }
  console.log('Running puppet:', puppet);
  const res = await fetch(base + '/runPuppet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puppetName: puppet, printifyProductURL: printifyURL }),
  });
  for await (const chunk of res.body) {
    // Node's fetch stream yields Uint8Array chunks; convert them to Buffer so
    // they render as text instead of comma separated numbers.
    process.stdout.write(Buffer.from(chunk).toString());
  }
})();
