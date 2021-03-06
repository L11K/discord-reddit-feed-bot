const express = require('express')
const app = express()
app.use(express.static('public'))
const listener = app.listen(process.env.PORT, () => {
	console.log(`Your app is listening on port ${listener.address().port}`)
})

const http = require('http');
app.get("/", (request, response) => {
	response.sendStatus(200);
});
setInterval(() => {
	http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);

'use strict';

require('dotenv').config();

const Discord = require('discord.js');
const request = require('request');
const entities = require('entities');
const logger = require('./logger');
const validUrl = require('valid-url');

const bot = new Discord.Client();

bot.login(process.env.DISCORD_TOKEN);

let botReady = false;
let lastTimestamp = Math.floor(Date.now() / 1000);

let Channel;
bot.on('ready', () => {
	// bot.user.setStatus('online', `Spamming F5 on /${process.env.SUBREDDIT}`).then(logger.info('Changed status!')).catch('ready failed to change status', logger.error); // if you want to change the status of the bot and set the game playing to something specific you may uncomment this

	Channel = bot.channels.get(process.env.DISCORD_CHANNELID);

	if (!Channel) {
		logger.error('A matching channel could not be found. Please check your DISCORD_CHANNELID environment variable.');
		process.exit(1);
	} else {
		logger.info('Ready');
		botReady = true;
	}
});

bot.on('error', (error) => {
	logger.error('Connection error', error);
	botReady = false;
});

bot.on('reconnecting', () => {
	logger.debug('Reconnecting');
});

const subredditUrl = `https://www.reddit.com/${process.env.SUBREDDIT}/new.json?limit=10`;

setInterval(() => {
	if (botReady) {
		request({
			url: subredditUrl,
			json: true,
		}, (error, response, body) => {
			if (!error && response.statusCode === 200) {
				logger.debug('Request succeeded, lastTimestamp = ', lastTimestamp);
				for (const post of body.data.children.reverse()) {
					if (lastTimestamp <= post.data.created_utc) {
						//waits 30sec for preview to show up on reddit
						if (Math.floor(Date.now() / 1000) - 30 >= post.data.created_utc) {
							lastTimestamp = post.data.created_utc;

							const embed = new Discord.RichEmbed();
							embed.setColor(process.env.EMBED_COLOR || '#007cbf');
							embed.setTitle(`${entities.decodeHTML(post.data.title)}`);
							embed.setURL(`https://redd.it/${post.data.id}`);
							embed.setDescription(`${post.data.is_self ? entities.decodeHTML(post.data.selftext.length > 253 ? post.data.selftext.slice(0, 253).concat('...') : post.data.selftext) : ''}`);
							if (post.data.preview) {
								embed.setImage(entities.decodeHTML(post.data.preview.images[0].source.url));
							} else {
								embed.setThumbnail(validUrl.isWebUri(post.data.thumbnail) ? post.data.thumbnail : null);
							}
							embed.setFooter(`/u/${post.data.author} in /r/${post.data.subreddit}`);
							embed.setTimestamp(new Date(post.data.created_utc * 1000));

							Channel.send('', embed).then(() => {
								logger.debug(`Sent message for new post https://redd.it/${post.data.id}`);
							}).catch(err => {
								logger.error(embed, err);
							});
						}
					}
				}
				++lastTimestamp;
			} else {
				logger.warn('Request failed - reddit could be down or subreddit doesn\'t exist. Will continue.');
				logger.debug(response, body);
			}
		});
	}
}, 30 * 1000); // 30 seconds

bot.on('error', (error) => {
    console.log(error.message);
    setTimeout(() => {
        console.log('Reconnecting bot client');
        bot.login(process.env.DISCORD_TOKEN);
    }, 5000);
});
