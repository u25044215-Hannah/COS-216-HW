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

API URL:
https://wheatley.cs.up.ac.za/u25044215/COS216PussInReboots/api.php


DB_HOST=wheatley.cs.up.ac.za
DB_USER=u25044215
DB_PASS=TUCTONLADCQBIP53ZCHGAEZBUIFPIHQI
DB_NAME=u25044215_PussInReboots
SERVER_API_KEY=PussInReboots
