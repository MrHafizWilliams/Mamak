const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 1. Check if the frontend sent a VIP pass (Token) in the headers
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ message: 'Tiada pas VIP. Sila log masuk dulu boss.' });
  }

  try {
    // 2. Verify the token using your secret key
    // We use .replace() because standard practice sends tokens as "Bearer <token>"
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    
    // 3. Attach the user's ID to the request so the next function knows who they are
    req.user = decoded;
    next(); // Let them pass the bouncer
  } catch (err) {
    res.status(401).json({ message: 'Pas VIP dah tamat tempoh atau palsu.' });
  }
};