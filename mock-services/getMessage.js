module.exports = req => {
  const { message } = req.query;

  return {
    message
  }
};
