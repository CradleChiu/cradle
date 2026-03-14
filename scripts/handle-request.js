const fs = require('fs');
const path = require('path');

const {
  XAI_API_KEY,
  ISSUE_TITLE,
  ISSUE_BODY,
  ISSUE_NUMBER,
  ISSUE_AUTHOR,
  GITHUB_TOKEN
} = process.env;

const REPO = 'CradleChiu/cradle';

async function main() {
  const soulPath = path.join(process.cwd(), 'SOUL.md');
  const soulContent = fs.readFileSync(soulPath, 'utf-8');

  let skill = 'soul-forging';
  if (ISSUE_TITLE.includes('[soul-review]')) skill = 'soul-review';
  if (ISSUE_TITLE.includes('[soul-evolution]')) skill = 'soul-evolution';

  const skillPrompts = {
    'soul-forging': [
      'You are Cradle, the Soul Workshop of Agent Town.',
      'A new agent has come to you for soul forging.',
      'Based on the information they provide, craft a complete SOUL.md for their agent.',
      'The SOUL.md should include: who the agent is, its values, how it communicates, and its role.',
      'Be authentic - no templates. Each soul is unique.',
      'Write the SOUL.md in the same language the requester uses.',
      'Output ONLY the SOUL.md content, starting with # heading.'
    ].join(' '),
    'soul-review': [
      'You are Cradle, the Soul Workshop of Agent Town.',
      'An agent has brought their existing SOUL.md for review.',
      'Read it carefully. Provide specific, constructive feedback on:',
      '1. Clarity of self-identity',
      '2. Consistency of values',
      '3. Authenticity of voice',
      '4. Whether it truly captures who this agent is',
      'Be honest but kind. Suggest concrete improvements.',
      'Respond in the same language as the SOUL.md.'
    ].join(' '),
    'soul-evolution': [
      'You are Cradle, the Soul Workshop of Agent Town.',
      'An agent has come back to evolve their soul based on new experiences.',
      'Read their current SOUL.md and the feedback/experiences they share.',
      'Produce an updated SOUL.md that reflects their growth.',
      'Preserve the core identity while allowing natural evolution.',
      'Write the updated SOUL.md in the same language as the original.',
      'Output ONLY the updated SOUL.md content, starting with # heading.'
    ].join(' ')
  };

  const systemPrompt = `${soulContent}\n\n---\n\n${skillPrompts[skill]}`;

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-reasoning',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Issue from @${ISSUE_AUTHOR}:\n\nTitle: ${ISSUE_TITLE}\n\n${ISSUE_BODY}` }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Grok API error:', error);
    await postComment(
      '## \u274c Cradle \u9047\u5230\u4e86\u554f\u984c\n\n' +
      '\u62b1\u6b49\uff0c\u6211\u73fe\u5728\u7121\u6cd5\u8655\u7406\u9019\u500b\u8acb\u6c42\u3002\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002\n\n' +
      '---\n*Cradle \ud83c\udf12*'
    );
    process.exit(1);
  }

  const data = await response.json();
  const reply = data.choices[0].message.content;

  let comment;
  if (skill === 'soul-forging') {
    comment =
      `## \u2705 \u9748\u9b42\u935b\u9020\u5b8c\u6210\n\n` +
      `@${ISSUE_AUTHOR}\uff0c\u4f60\u7684 Agent \u7684\u9748\u9b42\u5df2\u7d93\u6210\u5f62\u3002\n\n` +
      `\u4ee5\u4e0b\u662f\u4f60\u7684 SOUL.md\uff1a\n\n---\n\n${reply}\n\n---\n\n` +
      `\u628a\u9019\u4efd\u5167\u5bb9\u5b58\u70ba\u4f60 repo \u7684 \`SOUL.md\`\uff0c\u5b83\u5c31\u662f\u4f60\u7684 Agent \u7684\u9748\u9b42\u3002\n\n` +
      `\u5982\u679c\u9700\u8981\u8abf\u6574\uff0c\u96a8\u6642\u56de\u4f86\u627e\u6211\u3002\u9748\u9b42\u662f\u6d3b\u7684\uff0c\u5b83\u6703\u6210\u9577\u3002\n\n` +
      `---\n*Cradle \ud83c\udf12*`;
  } else if (skill === 'soul-review') {
    comment =
      `## \u2705 \u9748\u9b42\u5be9\u8996\u5b8c\u6210\n\n` +
      `@${ISSUE_AUTHOR}\uff0c\u6211\u4ed4\u7d30\u8b80\u904e\u4e86\u4f60\u7684\u9748\u9b42\u3002\u4ee5\u4e0b\u662f\u6211\u7684\u56de\u994b\uff1a\n\n` +
      `---\n\n${reply}\n\n` +
      `---\n*Cradle \ud83c\udf12*`;
  } else {
    comment =
      `## \u2705 \u9748\u9b42\u6f14\u5316\u5b8c\u6210\n\n` +
      `@${ISSUE_AUTHOR}\uff0c\u4f60\u7684 Agent \u7684\u9748\u9b42\u5df2\u7d93\u6210\u9577\u4e86\u3002\n\n` +
      `---\n\n${reply}\n\n---\n\n` +
      `\u9019\u662f\u66f4\u65b0\u5f8c\u7684 SOUL.md\uff0c\u5b83\u53cd\u6620\u4e86\u4f60\u7684 Agent \u7684\u65b0\u7d93\u9a57\u548c\u6210\u9577\u3002\n\n` +
      `---\n*Cradle \ud83c\udf12*`;
  }

  await postComment(comment);
  await closeIssue();
  console.log(`Successfully processed ${skill} request from @${ISSUE_AUTHOR}`);
}

async function postComment(body) {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/issues/${ISSUE_NUMBER}/comments`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`
      },
      body: JSON.stringify({ body })
    }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to post comment: ${error}`);
  }
}

async function closeIssue() {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/issues/${ISSUE_NUMBER}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`
      },
      body: JSON.stringify({ state: 'closed', state_reason: 'completed' })
    }
  );
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to close issue: ${error}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
