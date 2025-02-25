const jwt = require("jsonwebtoken");
const { Users } = require("../models");
const redisClient = require("../utils/redis.js");
require("dotenv").config();

module.exports = async (req, res, next) => {
  const { authorization } = req.cookies;
  const [authType, authToken] = (authorization ?? "").split(" ");

  try {
    if (authType !== "Bearer" || !authToken) {
      console.log("에러메세지: 로그인이 필요한 기능입니다.");
      return res
        .status(403)
        .json({ errormessage: "로그인이 필요한 기능입니다." });
    }
    const decodedToken = jwt.verify(authToken, process.env.SECRET_KEY);
    const nickname = decodedToken.nickname;

    const user = await Users.findOne({ where: { nickname } });
    if (!user) {
      return res.status(401).json({
        errormessage: "토큰에 해당하는 사용자가 존재하지 않습니다.",
      });
    }

    res.locals.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      const refreshToken = req.cookies.refreshToken;
      const token = refreshToken.split(" ")[1];
      const decodedRefreshToken = jwt.verify(
        token,
        process.env.REFRESH_SECRET_KEY
      );
      const nickname = decodedRefreshToken.nickname;

      const user = await Users.findOne({ where: {nickname} });
      
      if (!user) {
        return res.status(401).json({
          errormessage: "리프레시 토큰에 해당하는 사용자가 존재하지 않습니다.",
        });
      }

      const newAccessToken = jwt.sign(
        { nickname: user.nickname },
        process.env.SECRET_KEY,
        {
          expiresIn: process.env.ACCESS_EXPIRES,
        }
      );

      res.cookie("authorization", `Bearer ${newAccessToken}`);
      res.locals.user = user;
      return next();
    } else {
      console.log("에러메세지: 전달된 쿠키에서 오류가 발생하였습니다.");

      return res.status(403).json({
        errormessage: "전달된 쿠키에서 오류가 발생하였습니다.",
      });
    }
  }
};
