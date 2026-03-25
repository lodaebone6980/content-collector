/**
 * API 키 인증 미들웨어
 * 확장프로그램 등 외부 클라이언트 인증용
 */
function apiKeyAuth(req, res, next) {
  const apiKey = process.env.API_KEY;

  // API_KEY가 설정되지 않으면 인증 건너뜀
  if (!apiKey) return next();

  const provided = req.headers.authorization?.replace('Bearer ', '')
    || req.body?.apiKey
    || req.query?.apiKey;

  if (!provided || provided !== apiKey) {
    return res.status(401).json({ error: '인증 실패: 유효한 API 키가 필요합니다' });
  }

  next();
}

module.exports = { apiKeyAuth };
