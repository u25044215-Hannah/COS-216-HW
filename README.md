const config = {
  apiBase: 'https://wheatley.cs.up.ac.za/u25044215/COS216PussInReboots/api.php',
  serverKey: 'ask-hannah-privately'
};

async function callApi(payload) {
  const response = await fetch(config.apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return await response.json();
}
