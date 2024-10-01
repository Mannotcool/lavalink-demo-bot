// import and setup simple discord.js bot
const { Client, GatewayIntentBits } = require('discord.js');
const { LavalinkManager } = require("lavalink-client");
const config = require('./config.json');

// setup all intents
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
	GatewayIntentBits.MessageContent,
	GatewayIntentBits.GuildMembers,
]});

// create instance
client.lavalink = new LavalinkManager({
    nodes: [
        {
            authorization: config.lavalinkPassword,
            host: "localhost",
            port: 2333,
            id: "testnode",
        }
    ],
    sendToShard: (guildId, payload) => client.guilds.cache.get(guildId)?.shard?.send(payload),
    autoSkip: true,
    client: {
        id: config.clientId,
        username: config.botUsername,
    },
});

client.on("raw", d => client.lavalink.sendRawData(d)); // send raw data to lavalink-client to handle stuff

// login to discord with bot token
client.on('ready', () => {
    client.lavalink.init(client.user); // init lavalink
    console.log(`Logged in as ${client.user.tag}!`);
});

// check for messages with -play command and separate the query
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith('-play')) return;
    const query = message.content.slice(6);
    if (!query) return message.channel.send('Please provide a query to search for.');
    
    // actual player stuff
    const player = client.lavalink.getPlayer(message.guildId) || await client.lavalink.createPlayer({
        guildId: message.guild.id,
        voiceChannelId: message.member.voice.channelId,
        textChannelId: message.channelId,
        selfDeaf: true,
        selfMute: false,
        volume: '100',  // default volume
        instaUpdateFiltersFix: true, // optional
        applyVolumeAsFilter: false, // if true player.setVolume(54) -> player.filters.setVolume(0.54)
    });

    const connected = player.connected;

    if(!connected) await player.connect();

    if(player.voiceChannelId !== message.member.voice.channelId) return message.reply({ ephemeral: true, content: "You need to be in my Voice Channel" });

    const response = await player.search({ query: query }, message.author)
    if(!response || !response.tracks?.length) return message.reply({ content: `No Tracks found`, ephemeral: true });

    await player.queue.add(response.tracks[0]);

    await message.reply({
        content: `Added ${response.tracks[0].info.title} to the queue`,
    });

    if(!player.playing) await player.play(connected ? { volume: 100, paused: false } : undefined);
});


// login to discord with bot token
client.login(config.token);
