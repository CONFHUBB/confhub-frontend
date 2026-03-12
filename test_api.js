const http = require('http');

http.get('http://localhost:8080/api/v1/paper-author/paper/1', (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("BODY:", data);
  });
}).on('error', (err) => {
  console.error("Error:", err.message);
});
