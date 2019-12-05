module.exports = (req, res) => {
  res.cookie('test', 'hello', {
    expires: new Date(Date.now() + 1000 * 60 * 5)
  });

  res.setHeader('Content-Type', 'text/plain');
  res.status(401);

  return 'Hello!';
};
