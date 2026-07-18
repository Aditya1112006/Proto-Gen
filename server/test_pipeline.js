async function runTest() {
  const url = 'http://127.0.0.1:5001/api/prototype/generate';
  
  console.log('==========================================');
  console.log('STEP 1: Initial Prompt (Food Delivery App)');
  console.log('==========================================');
  const res1 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'make a food delivery app like zomato which have different sections' })
  });
  const data1 = await res1.json();
  let sessionId = data1.sessionId;
  console.log('Domain:', data1.metadata?.domain);
  console.log('Title:', data1.content?.title);
  console.log('Domain Changed?', data1.domainChanged);
  console.log('Session ID:', sessionId);

  console.log('\n==========================================');
  console.log('STEP 2: Incremental Update (Pizza, Burger)');
  console.log('==========================================');
  const res2 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Add more options in it like pizza burger for fast foods', sessionId })
  });
  const data2 = await res2.json();
  sessionId = data2.sessionId;
  console.log('Domain:', data2.metadata?.domain);
  console.log('Title:', data2.content?.title);
  console.log('Domain Changed?', data2.domainChanged);
  console.log('Session ID:', sessionId);

  console.log('\n==========================================');
  console.log('STEP 3: Domain Pivot (Tic Tac Toe)');
  console.log('==========================================');
  const res3 = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'now make a tic tac toe game', sessionId })
  });
  const data3 = await res3.json();
  console.log('Domain:', data3.metadata?.domain);
  console.log('Title:', data3.content?.title);
  console.log('Domain Changed?', data3.domainChanged);
  console.log('New Session ID:', data3.sessionId);
  console.log('Old Session ID:', sessionId);
}

runTest().catch(console.error);
