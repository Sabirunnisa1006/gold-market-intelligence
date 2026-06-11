// Currency conversion rates
const CURRENCY_RATES = {
    USD: 1,
    INR: 83.12  // 1 USD = 83.12 INR (approximate rate)
};

let currentCurrency = 'USD';

// Currency symbols
const CURRENCY_SYMBOLS = {
    USD: '$',
    INR: '₹'
};

// Gold Price Data Generator
function generateGoldPriceData(period) {
    const now = new Date();
    const data = [];
    let basePrice = 2045.50;
    let dataPoints, interval;

    switch(period) {
        case '1D':
            dataPoints = 24;
            interval = 60 * 60 * 1000;
            break;
        case '1W':
            dataPoints = 7;
            interval = 24 * 60 * 60 * 1000;
            break;
        case '1M':
            dataPoints = 30;
            interval = 24 * 60 * 60 * 1000;
            break;
        case '3M':
            dataPoints = 90;
            interval = 24 * 60 * 60 * 1000;
            break;
        case '1Y':
            dataPoints = 52;
            interval = 7 * 24 * 60 * 60 * 1000;
            break;
        case '5Y':
            dataPoints = 60;
            interval = 30 * 24 * 60 * 60 * 1000;
            break;
        default:
            dataPoints = 24;
            interval = 60 * 60 * 1000;
    }

    for (let i = dataPoints - 1; i >= 0; i--) {
        const timestamp = new Date(now - (i * interval));
        const volatility = Math.random() * 40 - 20;
        const trend = (dataPoints - i) * 0.5;
        const price = basePrice + volatility + trend;
        
        data.push({
            time: timestamp,
            price: parseFloat(price.toFixed(2))
        });
    }

    return data;
}

// Initialize Chart
let goldChart;

function initializeChart() {
    const ctx = document.getElementById('goldPriceChart').getContext('2d');
    const initialData = generateGoldPriceData('1D');

    goldChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: initialData.map(d => d.time.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })),
            datasets: [{
                label: 'Gold Price (USD/oz)',
                data: initialData.map(d => d.price),
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#FFD700',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#333',
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#FFD700',
                    bodyColor: '#fff',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'Price: $' + context.parsed.y.toFixed(2);
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#666',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#666',
                        callback: function(value) {
                            return '$' + value.toFixed(0);
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

// Update Chart
function updateChart(period) {
    const newData = generateGoldPriceData(period);
    
    let timeFormat;
    switch(period) {
        case '1D':
            timeFormat = { hour: '2-digit', minute: '2-digit' };
            break;
        case '1W':
        case '1M':
        case '3M':
            timeFormat = { month: 'short', day: 'numeric' };
            break;
        case '1Y':
        case '5Y':
            timeFormat = { year: 'numeric', month: 'short' };
            break;
        default:
            timeFormat = { hour: '2-digit', minute: '2-digit' };
    }

    goldChart.data.labels = newData.map(d => d.time.toLocaleString('en-US', timeFormat));
    goldChart.data.datasets[0].data = newData.map(d => d.price);
    goldChart.update('active');
}

// Convert price based on currency
function convertPrice(priceUSD) {
    return priceUSD * CURRENCY_RATES[currentCurrency];
}

// Format price with currency symbol
function formatPrice(price) {
    const symbol = CURRENCY_SYMBOLS[currentCurrency];
    return symbol + price.toFixed(2);
}

// Update live prices
function updateLivePrices() {
    const currentPriceUSD = 2045.50 + (Math.random() * 10 - 5);
    const currentPrice = convertPrice(currentPriceUSD);
    const change = (Math.random() * 2 - 0.5).toFixed(2);
    const changePercent = ((change / currentPriceUSD) * 100).toFixed(2);
    
    document.getElementById('current-price').textContent = formatPrice(currentPrice);
    
    const changeElement = document.getElementById('price-change');
    changeElement.textContent = (change >= 0 ? '+' : '') + changePercent + '%';
    changeElement.className = 'change ' + (change >= 0 ? 'positive' : 'negative');
    
    document.getElementById('daily-high').textContent = formatPrice(convertPrice(currentPriceUSD + Math.random() * 15));
    document.getElementById('daily-low').textContent = formatPrice(convertPrice(currentPriceUSD - Math.random() * 15));
    
    // Update price label
    const unit = currentCurrency === 'INR' ? '10g' : 'oz';
    document.getElementById('price-label').textContent = `Current Gold Price (${currentCurrency}/${unit})`;
}

// Update chart with currency conversion
function updateChartCurrency() {
    const currentData = goldChart.data.datasets[0].data;
    const convertedData = currentData.map(price => convertPrice(price / CURRENCY_RATES[currentCurrency === 'USD' ? 'INR' : 'USD']));
    
    goldChart.data.datasets[0].data = convertedData;
    goldChart.data.datasets[0].label = `Gold Price (${currentCurrency}/${currentCurrency === 'INR' ? '10g' : 'oz'})`;
    
    goldChart.options.scales.y.ticks.callback = function(value) {
        return CURRENCY_SYMBOLS[currentCurrency] + value.toFixed(0);
    };
    
    goldChart.update('active');
}

// Handle currency change
function handleCurrencyChange(newCurrency) {
    const oldCurrency = currentCurrency;
    currentCurrency = newCurrency;
    
    // Update live prices
    updateLivePrices();
    
    // Update chart
    updateChartCurrency();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeChart();
    
    // Currency selector
    const currencySelector = document.getElementById('currency-selector');
    currencySelector.addEventListener('change', function() {
        handleCurrencyChange(this.value);
    });
    
    const periodButtons = document.querySelectorAll('.btn-period');
    periodButtons.forEach(button => {
        button.addEventListener('click', function() {
            periodButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            updateChart(this.dataset.period);
        });
    });
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    const observerOptions = {
        threshold: 0.5,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.stat-card, .insight-card, .prediction-card, .investment-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    updateLivePrices();
    setInterval(updateLivePrices, 5000);
});

// Made with Bob
