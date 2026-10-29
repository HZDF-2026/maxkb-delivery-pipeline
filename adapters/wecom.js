// 通道2（桩）：企业微信自建应用回调 —— 需公网 HTTPS 回调地址，后续接入
module.exports = {
  enabled: false,
  note: '接入条件：公网 HTTPS 回调 URL + 企微后台配置 Token/AESKey；接入后将回调消息转 intake() 即可',
  handler: async () => { throw new Error('企微通道未启用：需公网部署后再接入'); }
};
