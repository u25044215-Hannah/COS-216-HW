Website for the api to call - https://wheatley.cs.up.ac.za/u25044215/COS216PussInReboots/api.php

NodeJS condig  - const config = {
  apiBase: 'https://wheatley.cs.up.ac.za/u25044215/COS216PussInReboots/api.php',
  serverKey: 'same_key_as_SERVER_API_KEY_in_env'
};

helper function - async function callApi(payload) {
  const response = await fetch(config.apiBase, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  return await response.json();
}

SERVER_API_KEY=PussInReboots
