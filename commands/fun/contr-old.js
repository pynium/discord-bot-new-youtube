const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

// Add stealth plugin to hide that we are a bot (still useful for Brave)
puppeteer.use(StealthPlugin());

// --- ADD THIS LINE TO SPECIFY BRAVE BROWSER EXECUTABLE PATH ---
const braveExecutablePath = '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser';


module.exports = {
    data: new SlashCommandBuilder()
        .setName('contr-old')
        .setDescription('Get top 10 counters using a stealth browser')
        .addStringOption(option =>
            option.setName('lane')
                .setDescription('The lane/role to check (e.g. Top, ADC)')
                .setRequired(true)
                .addChoices(
                    { name: 'Top', value: 'top' },
                    { name: 'Jungle', value: 'jungle' },
                    { name: 'Mid', value: 'middle' },
                    { name: 'ADC', value: 'adc' },
                    { name: 'Support', value: 'support' }
                )
        )
        .addStringOption(option =>
            option.setName('champion')
                .setDescription('The enemy champion name')
                .setRequired(true)
        ),
    async execute(interaction) {
        // 1. Defer Reply
        await interaction.deferReply();

        const role = interaction.options.getString('lane');
        const rawName = interaction.options.getString('champion');
        
        // 2. Format Name & Edge Cases
        let cleanName = rawName.toLowerCase().replace(/[^a-z]/g, '');
        const edgeCases = {
            'wukong': 'wukong', 'nunu': 'nunu', 'nunuwillump': 'nunu',
            'renata': 'renata', 'renataglasc': 'renata', 'drmundo': 'drmundo',
            'jarvaniv': 'jarvaniv', 'kogmaw': 'kogmaw', 'reksai': 'reksai',
            'ksante': 'ksante', 'belveth': 'belveth'
        };
        if (edgeCases[cleanName]) cleanName = edgeCases[cleanName];

        const url = `https://u.gg/lol/champions/${cleanName}/counter?rank=overall&role=${role}`;

        let browser;
        try {
            // 3. Launch Brave Browser
            browser = await puppeteer.launch({
                headless: "new",
                executablePath: braveExecutablePath, // <--- THIS IS THE KEY CHANGE
                args: [
                    '--no-sandbox', 
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--window-size=1920,1080'
                ]
            });

            const page = await browser.newPage();
            
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            await page.setViewport({ width: 1920, height: 1080 });

            // 4. Navigate and Wait (Increased Timeout to 60s)
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const title = await page.title();
            if (title.includes("Just a moment") || title.includes("Access denied")) {
                await browser.close();
                return interaction.editReply("⚠️ **Blocked:** U.GG is detecting the bot even with stealth mode. Try again later or use a different champion.");
            }

            // 5. Wait for Data Script (Increased Timeout to 30s)
            try {
                await page.waitForSelector('#__NEXT_DATA__', { timeout: 30000 });
            } catch (e) {
                const bodyText = await page.$eval('body', el => el.innerText);
                await browser.close();
                if (bodyText.includes("404") || bodyText.includes("Page Not Found")) {
                    return interaction.editReply(`❌ **Page Not Found**: **${rawName}** usually isn't played in **${role}**. Try a different role.`);
                }
                return interaction.editReply(`❌ **Timeout**: The page took too long to load data.`);
            }

            // 6. Extract Data
            const jsonString = await page.$eval('#__NEXT_DATA__', el => el.innerHTML);
            const jsonData = JSON.parse(jsonString);

            await browser.close();

            // 7. Parse Data
            let matchups = [];
            const pageProps = jsonData.props?.pageProps;

            if (pageProps?.matchups?.data?.best_matchups) {
                matchups = pageProps.matchups.data.best_matchups;
            } else if (pageProps?.data?.matchups?.best_matchups) {
                matchups = pageProps.data.matchups.best_matchups;
            } else if (pageProps?.adUnitSettings?.matchups?.data?.best_matchups) {
                matchups = pageProps.adUnitSettings.matchups.data.best_matchups;
            }

            if (!matchups || matchups.length === 0) {
                return interaction.editReply(`❌ No counter data found for **${rawName}** in **${role}**.`);
            }

            // 8. Fetch Patch Version for Images
            let latestVersion = "14.1.1";
            try {
                const vRes = await axios.get('https://ddragon.leagueoflegends.com/api/versions.json');
                latestVersion = vRes.data[0];
            } catch (e) { console.log("Failed to fetch version, using default"); }

            // 9. Format & Send
            const validCounters = matchups
                .map(m => {
                    let name = m.championKey || m.championName || "Unknown";
                    name = name.charAt(0).toUpperCase() + name.slice(1);
                    
                    let wr = m.winRate;
                    if (typeof wr === 'string') wr = parseFloat(wr);
                    if (wr <= 1) wr = wr * 100;
                    if (wr > 100) wr = wr / 100;
                    
                    return { name, wr: wr.toFixed(2) };
                })
                .filter(c => parseFloat(c.wr) >= 50.00)
                .sort((a, b) => parseFloat(b.wr) - parseFloat(a.wr))
                .slice(0, 10);

            if (validCounters.length === 0) {
                return interaction.editReply(`No counters found with >50% winrate against **${rawName}** in **${role}**.`);
            }

            const embed = new EmbedBuilder()
                .setTitle(`⚔️ Best Picks vs ${rawName.toUpperCase()} (${role.toUpperCase()})`)
                .setURL(url)
                .setColor('#3273FA')
                .setThumbnail(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/img/champion/${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}.png`)
                .setDescription(`Top champions with >50% winrate vs **${rawName}** in **${role}** (Platinum+):`)
                .addFields(
                    { name: 'Champion', value: validCounters.map((c, i) => `${i+1}. **${c.name}**`).join('\n'), inline: true },
                    { name: 'Win Rate', value: validCounters.map(c => `\`${c.wr}%\``).join('\n'), inline: true }
                )
                .setFooter({ text: `Patch ${latestVersion} • Data from U.GG (via Brave)` });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error("Puppeteer Crash:", error);
            if (browser) await browser.close();
            await interaction.editReply("❌ **System Error**: The bot's browser crashed or timed out.");
        }
    }
};