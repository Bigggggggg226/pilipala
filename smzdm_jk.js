/*
新建zdm.json
*/
const Parser = require('rss-parser');
const fs = require('fs');
const https = require('https');
const request = require('request');
const TELEGRAM_BOT_TOKEN = ''; //BOT_TOKEN
const TELEGRAM_CHAT_ID =''; //群组id
const pushplus = ''; //pushplus token

const parser = new Parser();
const rssUrls = [
  'http://faxian.smzdm.com/feed'
];

const keywords = '抽纸|卷纸|大米|花生油'; //自定义 什么值得买
const regex = new RegExp(keywords, 'i');

const newUrl = 'http://new.xianbao.fun/plus/json/push.json';

console.debug('开始获取和解析什么值得买以及线报酷数据...');
Promise.all([
  Promise.all(rssUrls.map(url => parser.parseURL(url))), 
  new Promise((resolve, reject) => { 
    request(newUrl, (error, response, body) => {
      if (!error && response.statusCode === 200) {
        resolve(JSON.parse(body));
      } else {
        resolve([]); 
      }
    });
  })
])
  .then(([rssFeeds, nonRssData]) => {
    console.debug('成功获取什么值得买和线报酷数据.');

    
    rssFeeds.forEach(feed => {
      feed.items.forEach(item => {
        const title = item.title;
        const link = item.link;

        const message = {
          source: '🎁什么值得买',
          title,
          link
        };

        if (regex.test(title) || regex.test(link)) {
          if (!isMessageInFile(message, 'zdm.json')) {
			sendMessage(message, 'Telegram'); // 发送到Telegram
			//sendMessage(message, 'PushPlus'); // 发送到PushPlus
            appendMessageToFile(message, 'zdm.json');
          }
        }
      });
    });

    // 处理线报酷数据
    nonRssData.forEach(item => {
      const catename = item.catename;
      const title = item.title;
      const content = item.content;
	  const url = item.url
      const yuanurl = item.yuanurl;

      const message = {
        source: '⭐线报酷⭐',
        catename,
        title,
        content,
		url,
        yuanurl
      };

      if ((catename === '新赚吧' || catename === '酷安' || catename === '赚客吧') && !isMessageInFile(message, 'zdm.json')) {
        sendMessage(message, 'Telegram'); // 发送到Telegram
		//sendMessage(message, 'PushPlus'); // 发送到PushPlus
        appendMessageToFile(message, 'zdm.json');
      }
    });
  })
  .catch(error => {
    console.error('获取和解析什么值得买/线报酷时发生错误:', error);
  });

function sendMessage(message, service) {
  const messageText = getMessageText(message);
  const sendMessageUrl = getSendMessageUrl(message, service);

  // 发送 HTTP 请求
  const options = {
    method: 'GET',
    uri: sendMessageUrl,
  };

  request(options, (error, response, body) => {
    if (!error && response.statusCode === 200) {
      console.debug(`${service} 消息已发送:`, messageText);
    } else {
      console.error(`发送 ${service} 消息时出现错误:`, error);
    }
  });
}

function getMessageText(message) {
  let messageText = `来源: ${message.source}\n`;

  if (message.source === '🎁什么值得买') {
    messageText += `标题: ${message.title}\n🔗: ${message.link || ''}`;
  } else if (message.source === '⭐线报酷⭐') {
    messageText += `平台: ${message.catename || ''}\n标题: ${message.title}\n内容: ${message.content || ''}\n🔗：http://new.xianbao.fun/${message.url || ''}\n源出处: ${message.yuanurl || ''}`;
  }

  return messageText;
}

function getSendMessageUrl(message, service) {
  if (service === 'Telegram') {
    return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${encodeURIComponent(getMessageText(message))}`;
  } else if (service === 'PushPlus') {
    const pushPlusToken = pushplus;
    return `http://www.pushplus.plus/send?token=${pushPlusToken}&content=${encodeURIComponent(getMessageText(message))}`;
  }
}


function isMessageInFile(message, filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  if (!data) {
    return false;
  }
  const messages = JSON.parse(data);
  return messages.some(existingMessage => existingMessage.title === message.title && existingMessage.link === message.link);
}

function appendMessageToFile(message, filePath) {
  const data = fs.readFileSync(filePath, 'utf8');
  const messages = data ? JSON.parse(data) : [];
  messages.push(message);
  fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
  console.debug(`消息已添加到文件 ${filePath}: ${JSON.stringify(message, null, 2)}`);
}