var nodemailer = require('nodemailer');
var config = require('./config');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.EMAIL_USERNAME,
    pass: config.EMAIL_PASSWORD
  }
});

var mailOptions = {
  from: config.EMAIL_USERNAME,
  to: config.EMAIL_USERNAME,
  subject: 'Summoner Request',
};

exports.sendMail = function(twitchName, summonerName, region) {
  mailOptions['text'] = twitchName + " ~ " + summonerName + " ~ " + region;
  transporter.sendMail(mailOptions, function(error, info){
  if (error) {
    console.log(error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});
}
