/* ===== Personal Finance Advisor — Agent Logic ===== */

(function () {
  'use strict';

  // ─── DOM References ───
  const stepPanels  = document.querySelectorAll('.step-panel');
  const stepIndicators = document.querySelectorAll('.step-indicator');
  const lines       = [document.getElementById('line-1-2'), document.getElementById('line-2-3')];
  const form        = document.getElementById('finance-form');
  const questionList = document.getElementById('question-list');
  const resultsCard = document.getElementById('results-card');

  let currentStep = 1;
  let userData = {};
  let followUpAnswers = {};

  // ─── Category metadata ───
  const CATEGORIES = {
    rent:          { label: 'Rent / Housing',  type: 'need',  icon: '🏠', recommended: 30 },
    utilities:     { label: 'Utilities',       type: 'need',  icon: '💡', recommended: 5  },
    transport:     { label: 'Transport',       type: 'need',  icon: '🚗', recommended: 10 },
    groceries:     { label: 'Groceries',       type: 'need',  icon: '🛒', recommended: 10 },
    entertainment: { label: 'Entertainment',   type: 'want',  icon: '🎬', recommended: 5  },
    dining:        { label: 'Dining Out',      type: 'want',  icon: '🍔', recommended: 5  },
    subscriptions: { label: 'Subscriptions',   type: 'want',  icon: '📱', recommended: 3  },
    misc:          { label: 'Miscellaneous',   type: 'want',  icon: '🎁', recommended: 7  },
  };

  // ─── Step Navigation ───
  function goToStep(n) {
    currentStep = n;
    stepPanels.forEach((p, i) => p.classList.toggle('active', i === n - 1));
    stepIndicators.forEach((ind, i) => {
      ind.classList.remove('active', 'completed');
      if (i + 1 === n) ind.classList.add('active');
      else if (i + 1 < n) ind.classList.add('completed');
    });
    lines.forEach((l, i) => l.classList.toggle('active', i + 1 < n));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ─── Step 1 → Collect Data ───
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const income = parseFloat(document.getElementById('income').value) || 0;
    if (income <= 0) { alert('Please enter a valid monthly income.'); return; }

    userData = { income };
    let totalExpenses = 0;
    Object.keys(CATEGORIES).forEach(key => {
      const val = parseFloat(document.getElementById(key).value) || 0;
      userData[key] = val;
      totalExpenses += val;
    });
    userData.totalExpenses = totalExpenses;
    userData.surplus = income - totalExpenses;

    generateFollowUpQuestions();
    goToStep(2);
  });

  // ─── Step 2 — Agentic Follow-up Engine ───
  function generateFollowUpQuestions() {
    const questions = [];
    const inc = userData.income;

    // High rent check
    if (userData.rent / inc > 0.35) {
      questions.push({
        id: 'rent_flex',
        icon: '🏠',
        text: `Your housing costs ₹${fmt(userData.rent)} — that's ${pct(userData.rent, inc)} of your income. Could you consider a more affordable option?`,
        options: ['Yes, I can move', 'Maybe in 6 months', 'No, it\'s fixed']
      });
    }

    // High entertainment + dining
    const funSpend = userData.entertainment + userData.dining;
    if (funSpend / inc > 0.12) {
      questions.push({
        id: 'fun_spend',
        icon: '🎉',
        text: `You spend ₹${fmt(funSpend)} on entertainment & dining (${pct(funSpend, inc)}). Would you be open to cutting this by 25%?`,
        options: ['Yes, let\'s cut it', 'Maybe a little', 'No, I enjoy it']
      });
    }

    // Subscriptions audit
    if (userData.subscriptions > 0) {
      questions.push({
        id: 'sub_audit',
        icon: '📱',
        text: `You're spending ₹${fmt(userData.subscriptions)} on subscriptions. Have you audited which ones you actually use?`,
        options: ['Yes, all are needed', 'I can cancel some', 'Never checked']
      });
    }

    // No savings or overspending
    if (userData.surplus < inc * 0.10) {
      questions.push({
        id: 'savings_goal',
        icon: '🎯',
        text: userData.surplus <= 0
          ? `You're spending more than you earn! What's your priority — cutting expenses or increasing income?`
          : `You're saving less than 10% of your income. What savings goal motivates you most?`,
        options: userData.surplus <= 0
          ? ['Cut expenses', 'Increase income', 'Both']
          : ['Emergency fund', 'Vacation', 'Investments', 'Debt payoff']
      });
    }

    // Transport cost check
    if (userData.transport / inc > 0.12) {
      questions.push({
        id: 'transport_alt',
        icon: '🚗',
        text: `Transport costs are ₹${fmt(userData.transport)} (${pct(userData.transport, inc)}). Could you switch to public transport or carpooling?`,
        options: ['Yes', 'Partially', 'Not possible']
      });
    }

    // Groceries vs dining balance
    if (userData.dining > userData.groceries && userData.dining > 0) {
      questions.push({
        id: 'cook_more',
        icon: '🍳',
        text: `You spend more on dining out (₹${fmt(userData.dining)}) than groceries (₹${fmt(userData.groceries)}). Cooking more could save money. Interested?`,
        options: ['Yes, I\'ll cook more', 'Sometimes', 'I prefer eating out']
      });
    }

    // Ensure at least 2 questions
    if (questions.length < 2) {
      questions.push({
        id: 'risk_preference',
        icon: '📊',
        text: 'What is your risk appetite for investments?',
        options: ['Conservative', 'Moderate', 'Aggressive']
      });
      if (questions.length < 2) {
        questions.push({
          id: 'goal_timeline',
          icon: '⏰',
          text: 'What\'s your financial planning timeline?',
          options: ['Short-term (< 1yr)', 'Medium (1-3yrs)', 'Long-term (3+yrs)']
        });
      }
    }

    renderQuestions(questions);
  }

  function renderQuestions(questions) {
    questionList.innerHTML = questions.map(q => `
      <div class="question-card" data-qid="${q.id}">
        <div class="q-icon">${q.icon}</div>
        <p>${q.text}</p>
        <div class="options">
          ${q.options.map((opt, i) => `<button type="button" class="option-btn" data-qid="${q.id}" data-val="${i}">${opt}</button>`).join('')}
        </div>
      </div>
    `).join('');

    // Click handlers
    questionList.querySelectorAll('.option-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const qid = this.dataset.qid;
        followUpAnswers[qid] = this.textContent;
        // visual selection
        document.querySelectorAll(`.option-btn[data-qid="${qid}"]`).forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
      });
    });
  }

  // ─── Step 2 Buttons ───
  document.getElementById('btn-back-1').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-get-plan').addEventListener('click', () => {
    generateResults();
    goToStep(3);
  });

  // ─── Step 3 — Budget Calculator & Insights ───
  function generateResults() {
    const inc = userData.income;
    const totalExp = userData.totalExpenses;
    const surplus = userData.surplus;

    // 50/30/20 ideal
    const idealNeeds   = inc * 0.50;
    const idealWants   = inc * 0.30;
    const idealSavings = inc * 0.20;

    // Actual categorisation
    let actualNeeds = 0, actualWants = 0;
    Object.keys(CATEGORIES).forEach(key => {
      if (CATEGORIES[key].type === 'need') actualNeeds += userData[key];
      else actualWants += userData[key];
    });
    const actualSavings = Math.max(0, surplus);

    // Health score
    const score = computeHealthScore(inc, actualNeeds, actualWants, actualSavings);

    // Insights & savings suggestions
    const insights = generateInsights(inc, actualNeeds, actualWants, actualSavings);
    const suggestions = generateSavingSuggestions();

    // Render
    resultsCard.innerHTML = `
      <div class="results-header">
        <h2>📊 Your Financial Plan</h2>
        <p class="subtitle">Based on your income of ₹${fmt(inc)} / month</p>
        <div class="score-badge ${score.cls}">
          ${score.emoji} Financial Health: <strong>${score.label}</strong> (${score.value}/100)
        </div>
      </div>

      <!-- Budget Breakdown -->
      <div class="budget-section">
        <h3>📋 Budget Breakdown (50/30/20 Rule)</h3>
        <div class="budget-grid">
          <div class="budget-card needs">
            <div class="card-icon">🏡</div>
            <div class="card-label">Needs (50%)</div>
            <div class="card-value">₹${fmt(idealNeeds)}</div>
            <div class="card-percent">Actual: ₹${fmt(actualNeeds)} (${pct(actualNeeds, inc)})</div>
          </div>
          <div class="budget-card wants">
            <div class="card-icon">🎮</div>
            <div class="card-label">Wants (30%)</div>
            <div class="card-value">₹${fmt(idealWants)}</div>
            <div class="card-percent">Actual: ₹${fmt(actualWants)} (${pct(actualWants, inc)})</div>
          </div>
          <div class="budget-card savings">
            <div class="card-icon">💎</div>
            <div class="card-label">Savings (20%)</div>
            <div class="card-value">₹${fmt(idealSavings)}</div>
            <div class="card-percent">Actual: ₹${fmt(actualSavings)} (${pct(actualSavings, inc)})</div>
          </div>
        </div>
      </div>

      <!-- Chart + Legend -->
      <div class="budget-section">
        <h3>🍩 Spending Distribution</h3>
        <div class="chart-area">
          <div class="chart-wrapper"><canvas id="budget-chart"></canvas></div>
          <div class="chart-legend" id="chart-legend"></div>
        </div>
      </div>

      <!-- Expense Bars -->
      <div class="budget-section">
        <h3>📈 Expense Breakdown</h3>
        <div class="expense-list" id="expense-bars"></div>
      </div>

      <!-- Insights & Suggestions -->
      <div class="insights-grid">
        <div class="insight-panel">
          <h3>💡 Spending Insights</h3>
          ${insights.map(i => `<div class="insight-item"><span class="icon">${i.icon}</span><span>${i.text}</span></div>`).join('')}
        </div>
        <div class="insight-panel">
          <h3>🐷 Saving Suggestions</h3>
          ${suggestions.map(s => `<div class="insight-item"><span class="icon">${s.icon}</span><span>${s.text}</span></div>`).join('')}
        </div>
      </div>

      <!-- Actions -->
      <div class="download-area">
        <button class="btn btn-secondary" id="btn-restart">↻ Start Over</button>
        <button class="btn btn-primary" id="btn-print" style="margin-left:12px">🖨️ Print / Save PDF</button>
      </div>
    `;

    // Render chart
    renderChart(actualNeeds, actualWants, actualSavings);
    renderExpenseBars();

    // Action buttons
    document.getElementById('btn-restart').addEventListener('click', () => {
      form.reset();
      followUpAnswers = {};
      goToStep(1);
    });
    document.getElementById('btn-print').addEventListener('click', () => window.print());
  }

  // ─── Health Score ───
  function computeHealthScore(inc, needs, wants, savings) {
    let score = 50;

    // Savings ratio contribution (max +30)
    const savingsRatio = savings / inc;
    if (savingsRatio >= 0.20) score += 30;
    else if (savingsRatio >= 0.10) score += 20;
    else if (savingsRatio >= 0.05) score += 10;
    else score -= 10;

    // Needs ratio (max +10)
    const needsRatio = needs / inc;
    if (needsRatio <= 0.50) score += 10;
    else if (needsRatio <= 0.60) score += 5;
    else score -= 5;

    // Wants ratio (max +10)
    const wantsRatio = wants / inc;
    if (wantsRatio <= 0.30) score += 10;
    else if (wantsRatio <= 0.40) score += 5;
    else score -= 5;

    // Follow-up answer bonuses
    if (followUpAnswers.fun_spend && followUpAnswers.fun_spend.includes('cut')) score += 5;
    if (followUpAnswers.sub_audit && followUpAnswers.sub_audit.includes('cancel')) score += 3;
    if (followUpAnswers.rent_flex && followUpAnswers.rent_flex.includes('move')) score += 5;
    if (followUpAnswers.transport_alt && followUpAnswers.transport_alt === 'Yes') score += 3;
    if (followUpAnswers.cook_more && followUpAnswers.cook_more.includes('cook')) score += 3;

    score = Math.max(0, Math.min(100, score));

    let label, cls, emoji;
    if (score >= 80) { label = 'Excellent'; cls = 'excellent'; emoji = '🌟'; }
    else if (score >= 60) { label = 'Good'; cls = 'good'; emoji = '👍'; }
    else if (score >= 40) { label = 'Fair'; cls = 'fair'; emoji = '⚠️'; }
    else { label = 'Needs Work'; cls = 'poor'; emoji = '🚨'; }

    return { value: score, label, cls, emoji };
  }

  // ─── Insights Generator ───
  function generateInsights(inc, needs, wants, savings) {
    const insights = [];

    if (needs / inc > 0.55) {
      insights.push({ icon: '🔴', text: `Your essential needs consume ${pct(needs, inc)} of income — above the recommended 50%. Look for ways to reduce fixed costs.` });
    } else {
      insights.push({ icon: '🟢', text: `Great! Your essential needs are at ${pct(needs, inc)} — within the recommended 50%.` });
    }

    if (wants / inc > 0.35) {
      insights.push({ icon: '🟡', text: `Discretionary spending is ${pct(wants, inc)} of income. Consider trimming wants to free up savings.` });
    } else {
      insights.push({ icon: '🟢', text: `Discretionary spending is a healthy ${pct(wants, inc)} of income.` });
    }

    if (savings / inc >= 0.20) {
      insights.push({ icon: '🟢', text: `You're saving ${pct(savings, inc)} — great job hitting the 20% target!` });
    } else if (savings > 0) {
      insights.push({ icon: '🟡', text: `You're saving only ${pct(savings, inc)}. Aim for at least 20% to build long-term wealth.` });
    } else {
      insights.push({ icon: '🔴', text: `You have no savings margin. This is urgent — consider cutting expenses immediately.` });
    }

    // Category-specific insights
    Object.keys(CATEGORIES).forEach(key => {
      const cat = CATEGORIES[key];
      const val = userData[key];
      const actualPct = (val / inc) * 100;
      if (actualPct > cat.recommended * 1.5 && val > 0) {
        insights.push({ icon: '⚡', text: `${cat.icon} ${cat.label} is ${actualPct.toFixed(0)}% of income — well above the typical ${cat.recommended}%.` });
      }
    });

    return insights;
  }

  // ─── Saving Suggestions ───
  function generateSavingSuggestions() {
    const suggestions = [];
    const inc = userData.income;

    // Adjust based on follow-up answers
    if (followUpAnswers.fun_spend) {
      if (followUpAnswers.fun_spend.includes('cut')) {
        const saving = Math.round((userData.entertainment + userData.dining) * 0.25);
        suggestions.push({ icon: '✂️', text: `Cut entertainment & dining by 25% → save ~₹${fmt(saving)}/month.` });
      } else if (followUpAnswers.fun_spend.includes('little')) {
        const saving = Math.round((userData.entertainment + userData.dining) * 0.10);
        suggestions.push({ icon: '✂️', text: `Trim entertainment & dining by 10% → save ~₹${fmt(saving)}/month.` });
      }
    }

    if (followUpAnswers.sub_audit) {
      if (followUpAnswers.sub_audit.includes('cancel')) {
        const saving = Math.round(userData.subscriptions * 0.4);
        suggestions.push({ icon: '📵', text: `Cancel unused subscriptions → save ~₹${fmt(saving)}/month.` });
      } else if (followUpAnswers.sub_audit.includes('Never')) {
        suggestions.push({ icon: '📋', text: `Audit your subscriptions — many people waste 30-40% on unused services.` });
      }
    }

    if (followUpAnswers.cook_more && followUpAnswers.cook_more.includes('cook')) {
      const saving = Math.round(userData.dining * 0.5);
      suggestions.push({ icon: '🍳', text: `Cook at home more often → save ~₹${fmt(saving)}/month on dining.` });
    }

    if (followUpAnswers.transport_alt === 'Yes') {
      const saving = Math.round(userData.transport * 0.3);
      suggestions.push({ icon: '🚌', text: `Switch to public transport → save ~₹${fmt(saving)}/month.` });
    }

    if (followUpAnswers.rent_flex && followUpAnswers.rent_flex.includes('move')) {
      const saving = Math.round(userData.rent * 0.15);
      suggestions.push({ icon: '🏠', text: `Move to a more affordable place → save ~₹${fmt(saving)}/month.` });
    }

    // Generic suggestions to fill
    if (userData.surplus > 0 && userData.surplus < inc * 0.20) {
      const gap = Math.round(inc * 0.20 - userData.surplus);
      suggestions.push({ icon: '🎯', text: `You need to free up ₹${fmt(gap)}/month to hit the 20% savings target.` });
    }

    suggestions.push({ icon: '🏦', text: 'Set up an automatic transfer to a savings account on payday.' });
    suggestions.push({ icon: '📱', text: 'Use a budgeting app to track daily expenses and stay accountable.' });

    if (userData.surplus >= inc * 0.10) {
      suggestions.push({ icon: '📈', text: 'Consider investing surplus in index funds or SIPs for long-term growth.' });
    }

    return suggestions;
  }

  // ─── Chart ───
  function renderChart(needs, wants, savings) {
    const ctx = document.getElementById('budget-chart').getContext('2d');
    const labels = [];
    const data = [];
    const colors = [];

    const chartColors = {
      rent:          '#6366f1',
      utilities:     '#818cf8',
      transport:     '#a78bfa',
      groceries:     '#c4b5fd',
      entertainment: '#22d3ee',
      dining:        '#67e8f9',
      subscriptions: '#a5f3fc',
      misc:          '#fbbf24',
    };

    Object.keys(CATEGORIES).forEach(key => {
      if (userData[key] > 0) {
        labels.push(CATEGORIES[key].label);
        data.push(userData[key]);
        colors.push(chartColors[key]);
      }
    });

    if (savings > 0) {
      labels.push('Savings');
      data.push(savings);
      colors.push('#34d399');
    }

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 8 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '65%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function (context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const pctVal = ((context.parsed / total) * 100).toFixed(1);
                return ` ₹${fmt(context.parsed)} (${pctVal}%)`;
              }
            }
          }
        }
      }
    });

    // Custom legend
    const legendEl = document.getElementById('chart-legend');
    legendEl.innerHTML = labels.map((l, i) => `
      <div class="legend-item">
        <span class="legend-dot" style="background:${colors[i]}"></span>
        <span>${l} — ₹${fmt(data[i])}</span>
      </div>
    `).join('');
  }

  // ─── Expense Bars ───
  function renderExpenseBars() {
    const container = document.getElementById('expense-bars');
    const maxVal = Math.max(...Object.keys(CATEGORIES).map(k => userData[k]), 1);

    container.innerHTML = Object.keys(CATEGORIES).map(key => {
      const val = userData[key];
      const widthPct = (val / maxVal) * 100;
      return `
        <div class="expense-row">
          <span class="exp-label">${CATEGORIES[key].icon} ${CATEGORIES[key].label}</span>
          <div class="exp-bar-bg"><div class="exp-bar" style="width:0%;" data-target="${widthPct}"></div></div>
          <span class="exp-amount">₹${fmt(val)}</span>
        </div>
      `;
    }).join('');

    // Animate bars
    requestAnimationFrame(() => {
      container.querySelectorAll('.exp-bar').forEach(bar => {
        bar.style.width = bar.dataset.target + '%';
      });
    });
  }

  // ─── Helpers ───
  function fmt(n) {
    return Number(n).toLocaleString('en-IN');
  }

  function pct(part, whole) {
    if (whole === 0) return '0%';
    return ((part / whole) * 100).toFixed(1) + '%';
  }

})();
