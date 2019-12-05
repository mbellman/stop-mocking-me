const delay = duration => new Promise(resolve => setTimeout(resolve, duration));

module.exports = async () => {
  await delay(1000);

  return {
    data: 'Done!'
  };
};
