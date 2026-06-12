/**
 * 多次元时空留声墙 - Roche 插件
 * 风格：Morandi 极简低饱和风格
 * 核心：彻底移除情绪化标签，NPC帖子由AI动态生成，100%交由角色人设、世界观以及真实聊天记忆来驱动回复。
 */
window.RochePlugin.register({
  id: "roche-multiverse-wall",
  name: "多次元时空留声墙",
  version: "1.3.0",
  apps: [
    {
      id: "roche-multiverse-wall-home",
      name: "多次元留声墙",
      icon: "public",
      iconImage: "",

      async mount(container, roche) {
        // 1. 注入动态莫兰迪样式
        const styleId = "roche-p-multiverse-style";
        if (!document.getElementById(styleId)) {
          const styleTag = document.createElement("style");
          styleTag.id = styleId;
          styleTag.innerHTML = `
            .roche-p-container {
              width: 100%; height: 100%; padding: 24px; box-sizing: border-box;
              display: flex; flex-direction: column; gap: 20px; overflow: hidden;
              transition: background-color 0.4s ease, color 0.4s ease;
            }
            .theme-modern { background-color: #f5f2eb; color: #4a4540; }
            .theme-ancient { background-color: #ebeff0; color: #384042; }
            .theme-future { background-color: #e3e4e6; color: #3a3c40; }

            .roche-p-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(0,0,0,0.06); padding-bottom: 16px; }
            .roche-p-title { font-size: 20px; font-weight: 600; display: flex; align-items: center; gap: 12px; }
            .theme-tab-group { display: flex; background: rgba(0,0,0,0.04); padding: 4px; border-radius: 20px; gap: 4px; }
            .theme-tab-btn { border: none; padding: 6px 14px; border-radius: 16px; font-size: 12px; cursor: pointer; background: transparent; color: inherit; transition: all 0.2s; }
            .theme-tab-btn.active { background: #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.05); font-weight: 600; }
            
            .roche-p-controls { display: flex; align-items: center; gap: 16px; }
            .radar-switch-label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; background: rgba(0,0,0,0.04); padding: 6px 12px; border-radius: 20px; user-select: none; }
            .radar-switch-label input { cursor: pointer; accent-color: #8a8078; }
            
            .roche-p-btn { padding: 8px 16px; border: none; border-radius: 20px; font-size: 13px; cursor: pointer; transition: all 0.2s; background: rgba(0,0,0,0.08); color: inherit; }
            .roche-p-btn:hover { background: rgba(0,0,0,0.15); }
            .roche-p-btn.close { background: rgba(200,150,150,0.15); }
            
            .roche-p-main { flex: 1; display: flex; gap: 20px; overflow: hidden; }
            .roche-p-sidebar { width: 310px; background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); border-radius: 16px; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; }
            .sidebar-label { font-size: 13px; font-weight: 600; opacity: 0.8; }
            
            .roche-p-select, .roche-p-input { width: 100%; padding: 10px; border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; background: rgba(255,255,255,0.5); color: inherit; box-sizing: border-box; font-size: 13px; outline: none; }
            .roche-p-board { flex: 1; background: rgba(255,255,255,0.3); border-radius: 16px; padding: 20px; box-sizing: border-box; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
            
            .wall-card { background: rgba(255,255,255,0.8); border-radius: 12px; padding: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.01); display: flex; flex-direction: column; gap: 10px; border-left: 4px solid rgba(0,0,0,0.15); }
            .card-meta { display: flex; justify-content: space-between; font-size: 11px; opacity: 0.6; }
            .card-content { font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
            .card-reply-box { margin-top: 4px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.08); font-size: 12px; }
            .reply-author { font-weight: 600; opacity: 0.9; margin-bottom: 4px; }
            .reply-text { background: rgba(0,0,0,0.03); padding: 8px; border-radius: 6px; color: inherit; display: inline-block; width: 100%; box-sizing: border-box; white-space: pre-wrap; }
            .reply-loading { font-style: italic; opacity: 0.5; animation: blink 1.5s infinite; }
            @keyframes blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
            
            .refresh-board-btn { background: rgba(0,0,0,0.04); border: none; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: inherit; font-size: 16px; transition: background 0.2s; }
            .refresh-board-btn:hover { background: rgba(0,0,0,0.1); }
          `;
          document.head.appendChild(styleTag);
        }

        // 2. 读取初始化配置
        const charList = await roche.character.list();
        let currentAnchor = (await roche.storage.get("current_time_anchor")) || "modern"; 
        let radarState = await roche.storage.get("radar_memory_switch");
        if (radarState === undefined) radarState = true;

        // 从缓存读取所有帖子
        let allPosts = (await roche.storage.get("multiverse_posts_store_v2")) || [];

        // 3. 渲染UI框架
        container.innerHTML = `
          <div class="roche-p-container theme-${currentAnchor}" id="multiverse-container">
            <div class="roche-p-header">
              <div class="roche-p-title">
                🌌 <span id="wall-title-text">时空留声墙</span>
                <div class="theme-tab-group">
                  <button class="theme-tab-btn ${currentAnchor==='modern'?'active':''}" data-anchor="modern">现世校园</button>
                  <button class="theme-tab-btn ${currentAnchor==='ancient'?'active':''}" data-anchor="ancient">浮生古风</button>
                  <button class="theme-tab-btn ${currentAnchor==='future'?'active':''}" data-anchor="future">极夜未来</button>
                </div>
                <button id="refresh-board-data" class="refresh-board-btn" title="AI动态刷新该时空的NPC社区生态">🔄</button>
              </div>
              <div class="roche-p-controls">
                <label class="radar-switch-label" title="开启：融入近期真实聊天记忆与世界观认知；关闭：彻底隔绝记忆，完全由其原生独立人设应对。">
                  <input type="checkbox" id="radar-memory-switch" ${radarState ? "checked" : ""}>
                  🧬 羁绊记忆雷达
                </label>
                <button id="roche-p-close" class="roche-p-btn close">离开留声墙</button>
              </div>
            </div>
            
            <div class="roche-p-main">
              <div class="roche-p-sidebar">
                <div class="sidebar-label" id="label-char-select">👤 选定要浏览此墙的角色</div>
                <select id="wall-char-select" class="roche-p-select">
                  <option value="">-- 请选择拉入时角色的角色 --</option>
                  ${charList.map(c => `<option value="${c.id}">${c.handle || c.name}</option>`).join("")}
                </select>
                
                <div style="border-top: 1px solid rgba(0,0,0,0.05); padding-top: 10px;">
                  <div class="sidebar-label" id="label-feature-input" style="margin-bottom:6px;">📝 你在此维度的外貌/身份特征</div>
                  <input type="text" id="user-feature-input" class="roche-p-input" placeholder="穿格子衬衫/束发束玉/拥有霓虹义眼">
                  <p style="font-size:11px; opacity:0.5; margin: 4px 0 0 0;">(用于路人生成捞你的匿名告示，留空则随机生成)</p>
                </div>
                
                <button id="trigger-be-found-btn" class="roche-p-btn" style="width:100%; margin-top: auto; background: rgba(0,0,0,0.05); font-weight:600;">📡 触发路人捞我的告示</button>
              </div>
              
              <div id="wall-board-area" class="roche-p-board"></div>
            </div>
          </div>
        `;

        const viewContainer = container.querySelector("#multiverse-container");
        const boardArea = container.querySelector("#wall-board-area");
        const titleText = container.querySelector("#wall-title-text");
        const triggerBtn = container.querySelector("#trigger-be-found-btn");
        const featureInput = container.querySelector("#user-feature-input");

        // 4. 时空文字词汇动态适配器
        const updateLanguageContext = () => {
          if (currentAnchor === 'ancient') {
            titleText.innerText = "坊间八卦揭榜墙";
            triggerBtn.innerText = "📜 凝聚灵力悬赏寻我";
            featureInput.placeholder = "例：身着素雪绢衣、腰系青玉";
          } else if (currentAnchor === 'future') {
            titleText.innerText = "暗网匿名情报板";
            triggerBtn.innerText = "🎛️ 广播黑市数据流寻找我";
            featureInput.placeholder = "例：右臂接入高阶冷光义体";
          } else {
            titleText.innerText = "校园万能表白墙";
            triggerBtn.innerText = "🏫 匿名挂上表白墙捞我";
            featureInput.placeholder = "例：穿格子衬衫、戴黑色耳机";
          }
        };

        // 5. 看板本地渲染
        const refreshBoardView = () => {
          updateLanguageContext();
          const filtered = allPosts.filter(p => p.anchor === currentAnchor);
          
          if (filtered.length === 0) {
            boardArea.innerHTML = `<div id="board-loading-placeholder" style="text-align:center; opacity:0.4; font-size:13px; margin-top:40px;">该时空尚无留声。点击上方 🔄 即可通过 AI 动态催生一整面墙的 NPC 生态和路人日常。</div>`;
            return;
          }

          boardArea.innerHTML = filtered.map(post => `
            <div class="wall-card" style="border-left-color: ${currentAnchor==='ancient'?'#8fa1a6':currentAnchor==='future'?'#7b7e85':'#c4b6ad'}">
              <div class="card-meta">
                <span>${post.tag}</span>
                <span>📌 ID: ${post.id.slice(0,4)}</span>
              </div>
              <div class="card-content">${this.escapeHtml(post.text)}</div>
              <div class="card-reply-box">
                ${post.reply ? `
                  <div class="reply-author">💬 【${this.escapeHtml(post.reply.author)}】 的公开留痕：</div>
                  <div class="reply-text">${this.escapeHtml(post.reply.content)}</div>
                ` : post.isGenerating ? `
                  <div class="reply-loading">角色正在审视此告示，权衡心智中...</div>
                ` : `
                  <button class="roche-p-btn let-char-read-btn" data-id="${post.id}" style="font-size:11px; padding:4px 10px;">让选定角色审视此条</button>
                `}
              </div>
            </div>
          `).join("");

          boardArea.querySelectorAll(".let-char-read-btn").forEach(btn => {
            btn.onclick = () => executeCharReview(btn.getAttribute("data-id"));
          });
        };

        // 6. AI 动态生成 NPC 社区八卦生态
        const generateNpcEcology = async () => {
          boardArea.innerHTML = `<div style="text-align:center; opacity:0.5; font-size:13px; margin-top:40px;">🔮 AI 正在虚构该维度的原住民八卦流，请稍候...</div>`;
          
          try {
            let worldPrompt = "";
            if (currentAnchor === "ancient") {
              worldPrompt = "你现在是修仙界长生主城的坊间布告栏看守。请随机动态生成 3 条完全属于修仙界原住民（修仙小辈、门派执事、炼丹散修等）的匿名吐槽、求助或日常告示。字里行间要有‘道心、炸炉、御剑、灵石、仙门’等原汁原味的古风修真市井感。";
            } else if (currentAnchor === "future") {
              worldPrompt = "你现在是赛博朋克反乌托邦底层不夜城的暗网情报板管理员。请随机动态生成 3 条完全属于赛博世界原住民（雇佣兵、黑客、赛博街头混混、义体医生等）的匿名广播、交易或吐槽。字里行间要有‘义体、局域网、信用点、中间人、黑入、漏电’等赛博风味。";
            } else {
              worldPrompt = "你现在是现代大学万能校园墙的小编。请随机动态生成 3 条真实的、接地气的大学生匿名吐槽、失物招领或日常捞人八卦。字里行间要有‘食堂、期末挂科、校园卡、高数、奶茶、自行车’等现代校园烟火气。";
            }

            worldPrompt += "\n\n要求：严格以 JSON 数组格式输出，不要带有 markdown 标记。数组里包含 3 个对象，每个对象必须严格包含 'tag' (简短标签如: 📜 炸炉吐槽) 和 'text' (具体的告示内容，字数在60字内，可以自带1句其他 NPC 搞笑的路人回复夹杂在文本末尾)。\n示例格式：[{\"tag\":\"...\",\"text\":\"...\"}]";

            const aiRes = await roche.ai.chat({
              messages: [
                { role: "system", content: "你是一个严格的JSON结构化数据生成器。" },
                { role: "user", content: worldPrompt }
              ],
              temperature: 0.85
            });

            let cleanText = aiRes.text || "[]";
            cleanText = cleanText.replace(/```json/g, "").replace(/```/g, "").trim();
            const parsedPosts = JSON.parse(cleanText);

            // 清除旧的纯 NPC 帖子，保留用户触发的捞人帖
            allPosts = allPosts.filter(p => p.anchor !== currentAnchor || p.isUserTriggered);

            parsedPosts.forEach(p => {
              allPosts.push({
                id: crypto.randomUUID(),
                anchor: currentAnchor,
                tag: p.tag || "📌 留声",
                text: p.text,
                reply: null,
                isGenerating: false,
                isUserTriggered: false
              });
            });

            await roche.storage.set("multiverse_posts_store_v2", allPosts);
            refreshBoardView();
            roche.ui.toast("🌌 该时空 NPC 社区动态演化成功！");

          } catch (e) {
            console.error(e);
            roche.ui.toast("时空乱流干扰，AI未能完全生成生态，请重试");
            refreshBoardView();
          }
        };

        // 7. 触发“路人捞我”帖子生成 (AI 动态扣合特征)
        triggerBtn.onclick = async () => {
          const customFeature = featureInput.value.trim();
          triggerBtn.innerText = "📡 正在用AI编织告示...";
          triggerBtn.disabled = true;

          try {
            let prompt = `根据当前选择的时空维度【${currentAnchor}】（modern=现世校园, ancient=古风修仙, future=赛博未来），写一条路人NPC偶然瞥见 User 后的仰慕捞人告示。\n`;
            prompt += `User 在这个维度的外貌特征描述为：${customFeature || "默认常规外貌"}\n`;
            prompt += `要求：\n`;
            prompt += `1. 100%符合该时空维度的说话风格和载体环境（古风要写悬赏揭榜、赛博写黑市数据锁定、校园写求QQ微信奶茶）。\n`;
            prompt += `2. 字数控制在60字内，极其自然地把上面的‘外貌特征描述’嵌入进去，营造出‘路人在人群里被惊艳到，念念不忘求捞人’的真实路人视角。\n`;
            prompt += `3. 直接输出告示文本，不要包含任何前缀或旁白。`;

            const aiRes = await roche.ai.chat({
              messages: [{ role: "user", content: prompt }],
              temperature: 0.8
            });

            let tag = "🏫 墙面捞人";
            if(currentAnchor === "ancient") tag = "📜 寻仙踪";
            if(currentAnchor === "future") tag = "🎛️ 坐标扫描";

            allPosts.unshift({
              id: crypto.randomUUID(),
              anchor: currentAnchor,
              tag: tag,
              text: aiRes.text || "（由于时空信号微弱，只留下一片模糊的描述）",
              reply: null,
              isGenerating: false,
              isUserTriggered: true // 标记为用户触发的特殊捞人贴
            });

            await roche.storage.set("multiverse_posts_store_v2", allPosts);
            featureInput.value = "";
            refreshBoardView();
            roche.ui.toast("📡 捞你的告示已完美隐蔽混入 NPC 众生相中！");

          } catch(e) {
            roche.ui.toast("AI 编织线索失败");
          } finally {
            triggerBtn.disabled = false;
            updateLanguageContext();
          }
        };

        // 8. 核心 AI 心智权衡回复引擎
        const executeCharReview = async (postId) => {
          const charId = container.querySelector("#wall-char-select").value;
          if (!charId) { roche.ui.toast("请先选择浏览此墙的角色"); return; }

          const postIndex = allPosts.findIndex(p => p.id === postId);
          if (postIndex === -1) return;

          let targetChar;
          try { targetChar = await roche.character.get(charId); } catch(e) { return; }
          const charDisplayName = targetChar.handle || targetChar.name;

          allPosts[postIndex].isGenerating = true;
          refreshBoardView();

          try {
            const charPersona = targetChar.persona || targetChar.bio || "";
            const messages = [];

            let systemPrompt = `你正在完美扮演角色【${targetChar.name}】（昵称: ${charDisplayName}）。\n`;
            systemPrompt += `【你的基础人设档案与行为习惯】:\n${charPersona}\n\n`;
            
            let environmentDesc = currentAnchor === "ancient" ? "修仙界的坊间八卦揭榜墙前" : currentAnchor === "future" ? "底层不夜城的暗网匿名吹水论坛" : "学校的现代校园万能表白墙上";
            systemPrompt += `【当前场景】:\n你此刻正站在${environmentDesc}，并扫视到了下面这条匿名投稿：“${allPosts[postIndex].text}”\n\n`;

            if (radarState && allPosts[postIndex].isUserTriggered) {
              // 触发了捞人贴且开了雷达：结合真实聊天记录
              const shortTermMemories = await roche.memory.getShortTerm({
                conversationId: targetChar.conversationId, limit: 30
              });

              let memoryText = shortTermMemories && shortTermMemories.length > 0 
                ? shortTermMemories.map(m => `${m.senderHandle || m.senderName || '用户'}: ${m.text}`).join("\n")
                : "（暂无近期交流线索，说明你们目前关系尚浅）";

              systemPrompt += `【你此时的心智事实（羁绊雷达模式）】:\n`;
              systemPrompt += `1. 经过世界维度的感知，你【非常确信】这条路人悬赏/表白里描述的被捞特征，就是你所熟知的 User 本人！\n`;
              systemPrompt += `2. 严禁参考任何吃醋或男德的公式化标签。请仔细阅读下方你和 User【最真实的最新聊天记忆流】，评估你们当前的实际关系阶段（热恋/暗恋/君臣/甚至相爱相杀的宿敌阶段）：\n`;
              systemPrompt += `   === 你们最近的真实聊天记忆线索 ===\n${memoryText}\n\n`;
              systemPrompt += `3. 请100%基于【你的人设档案】和【你们目前的真实聊天关系】，写下你作为这个角色的公开回复。你们若在聊天中正甜蜜，便自然带上你们的默契与暗号进行反向拆穿；你们若处于冷淡或戒备，请严格继承这个状态。不要喊出她的全名，在围观路人前留下符合你个性的公开印记。`;
            } else {
              // 没开雷达，或者是无关NPC的帖子
              systemPrompt += `【你此时的心智事实（原生人设发挥模式）】:\n`;
              systemPrompt += `1. 在你的世界线里，你【完全不知道】这个发帖人和被捞人是谁！这就是一堆与你毫无干系的陌生原住民留下的市井废话或无聊八卦。\n`;
              systemPrompt += `2. 请完全根据你的【性格核心、情商高低、教养以及在你原生世界观下看到这种路人闲聊时的真实行为习惯】做出选择。拒绝千篇一律。如果你原本就是清冷寡言、不屑社交的（如高傲剑尊、冷酷杀手），你可以选择无视或者训斥其浮躁；如果你人设本就是温和、喜欢维持社交风度（如现世温和海王学长），你可以幽默互动或礼貌道谢。由人设本尊说了算！`;
            }

            systemPrompt += `\n\n【限制要求】: 直接输出公开回复内容。严禁带有心理独白标签、严禁带有旁白。直接以【${charDisplayName}】的口吻写下回复，字数控制在2-3句内，精准、拒绝OOC。`;

            messages.push({ role: "system", content: systemPrompt });
            messages.push({ role: "user", content: `请基于你的独立人设和客观记忆状态做出公开回复。` });

            const aiResult = await roche.ai.chat({ messages: messages, temperature: 0.7 });

            allPosts[postIndex].isGenerating = false;
            allPosts[postIndex].reply = {
              author: charDisplayName,
              content: aiResult.text || "……（默默看了一眼，没有留下任何墨迹便走开了）"
            };
            
            await roche.storage.set("multiverse_posts_store_v2", allPosts);
            refreshBoardView();

          } catch (err) {
            allPosts[postIndex].isGenerating = false;
            allPosts[postIndex].reply = { author: charDisplayName, content: "（因跨次元屏障扰动，未成功留下墨迹）" };
            refreshBoardView();
          }
        };

        // 9. 顶部刷新按钮逻辑
        container.querySelector("#refresh-board-data").onclick = () => generateNpcEcology();

        // 10. 切换锚点事件
        container.querySelectorAll(".theme-tab-btn").forEach(btn => {
          btn.onclick = async (e) => {
            container.querySelectorAll(".theme-tab-btn").forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            currentAnchor = e.target.getAttribute("data-anchor");
            await roche.storage.set("current_time_anchor", currentAnchor);
            viewContainer.className = `roche-p-container theme-${currentAnchor}`;
            refreshBoardView();
          };
        });

        // 首次初始化视图
        refreshBoardView();
      },

      async unmount(container, roche) {
        const styleTag = document.getElementById("roche-p-multiverse-style");
        if (styleTag) styleTag.remove();
        container.replaceChildren();
      },

      escapeHtml(str) {
        if (!str) return "";
        return str
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
      }
    }
  ]
});
