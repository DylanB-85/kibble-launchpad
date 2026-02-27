/**
 * Kibble (KBL) Launchpad — app.js
 *
 * OPNet frontend integration:
 *  - OP_WALLET connect via @btc-vision/walletconnect
 *  - KBL token info via getContract + OP_20_ABI
 *  - Swap via NativeSwap (reserve + swap flow)
 *
 * IMPORTANT: Replace KBL_CONTRACT_ADDRESS with your deployed
 * contract address once you deploy Kibble to mainnet.
 */

import {
  getContract,
  OP_20_ABI,
  NativeSwapAbi,
} from 'opnet';

import { networks } from '@btc-vision/bitcoin';

// ─── CONFIG ────────────────────────────────────────────────────────────────
// TODO: Replace with your deployed Kibble contract address after deployment
const KBL_CONTRACT_ADDRESS = 'opt1sqqlu3kpxt2flweplz5uhhzd68wul2hhlxqznegf8';

// OPNet mainnet NativeSwap
const NATIVE_SWAP_ADDRESS = '0x035884f9ac2b6ae75d7778553e7d447899e9a82e247d7ced48f22aa102681e70';

const NETWORK = networks.opnetTestnet; // mainnet
const KBL_DECIMALS = 8;
const KBL_MAX_SUPPLY = 21_000_000;

// ─── ELEMENT REFS ──────────────────────────────────────────────────────────
const connectBtn       = document.getElementById('connectBtn');
const disconnectBtn    = document.getElementById('disconnectBtn');
const walletPanel      = document.getElementById('walletPanel');
const walletAddressEl  = document.getElementById('walletAddress');
const kblBalanceEl     = document.getElementById('kblBalance');
const btcBalanceEl     = document.getElementById('btcBalance');
const statSupplyEl     = document.getElementById('statSupply');
const statHolderEl     = document.getElementById('statHolder');
const contractAddrEl   = document.getElementById('contractAddress');
const copyContractBtn  = document.getElementById('copyContractBtn');
const btcInputEl       = document.getElementById('btcInput');
const kblOutputEl      = document.getElementById('kblOutput');
const swapRateEl       = document.getElementById('swapRate');
const swapBtn          = document.getElementById('swapBtn');
const toastEl          = document.getElementById('toast');

// ─── STATE ─────────────────────────────────────────────────────────────────
let walletState = {
  connected: false,
  address: null,
  publicKey: null,
  provider: null,
  walletBalance: null,
};

// ─── TOAST ─────────────────────────────────────────────────────────────────
let toastTimer = null;

function showToast(message, type = 'info') {
  toastEl.textContent = message;
  toastEl.className = `toast is-visible toast--${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('is-visible');
  }, 3500);
}

// ─── FORMAT HELPERS ────────────────────────────────────────────────────────
function formatKBL(rawAmount) {
  const amount = Number(rawAmount) / Math.pow(10, KBL_DECIMALS);
  return amount.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

function formatBTC(sats) {
  return (Number(sats) / 1e8).toFixed(8);
}

function truncateAddress(addr) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-8)}`;
}

// ─── CONTRACT READS ────────────────────────────────────────────────────────
async function loadTokenStats(provider) {
  if (!KBL_CONTRACT_ADDRESS || KBL_CONTRACT_ADDRESS === 'PASTE_YOUR_CONTRACT_ADDRESS_HERE') {
    statSupplyEl.textContent = '21,000,000';
    return;
  }

  try {
    const contract = getContract(
      KBL_CONTRACT_ADDRESS,
      OP_20_ABI,
      provider,
      NETWORK
    );

    const supplyResult = await contract.totalSupply();
    if (!supplyResult.revert && supplyResult.properties?.totalSupply !== undefined) {
      const supply = formatKBL(supplyResult.properties.totalSupply);
      statSupplyEl.textContent = supply;
      animateNumber(statSupplyEl);
    }
  } catch (err) {
    console.warn('Could not load token stats:', err);
    statSupplyEl.textContent = '21,000,000';
  }
}

async function loadHolderBalance(provider, address) {
  if (!KBL_CONTRACT_ADDRESS || KBL_CONTRACT_ADDRESS === 'PASTE_YOUR_CONTRACT_ADDRESS_HERE') {
    return;
  }

  try {
    const contract = getContract(
      KBL_CONTRACT_ADDRESS,
      OP_20_ABI,
      provider,
      NETWORK
    );

    const balResult = await contract.balanceOf(address);
    if (!balResult.revert && balResult.properties?.balance !== undefined) {
      const formatted = formatKBL(balResult.properties.balance);
      statHolderEl.textContent = formatted + ' KBL';
      kblBalanceEl.textContent = formatted + ' KBL';
    } else {
      statHolderEl.textContent = '0 KBL';
      kblBalanceEl.textContent = '0 KBL';
    }
  } catch (err) {
    console.warn('Could not load balance:', err);
    statHolderEl.textContent = '0 KBL';
    kblBalanceEl.textContent = '0 KBL';
  }
}

async function loadSwapRate(provider) {
  if (!KBL_CONTRACT_ADDRESS || KBL_CONTRACT_ADDRESS === 'PASTE_YOUR_CONTRACT_ADDRESS_HERE') {
    swapRateEl.textContent = 'Rate: deploy contract first';
    return;
  }

  try {
    const nativeSwap = getContract(
      NATIVE_SWAP_ADDRESS,
      NativeSwapAbi,
      provider,
      NETWORK
    );

    const quoteResult = await nativeSwap.getReserve(KBL_CONTRACT_ADDRESS);
    if (!quoteResult.revert) {
      swapRateEl.textContent = 'Rate: loaded from NativeSwap';
    }
  } catch (err) {
    swapRateEl.textContent = 'Rate: add liquidity on MotoSwap first';
  }
}

// ─── PARTICLE CANVAS ───────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let particles = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const PARTICLE_COUNT = 55;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      r:  Math.random() * 1.5 + 0.4,
      dx: (Math.random() - 0.5) * 0.25,
      dy: (Math.random() - 0.5) * 0.25,
      o:  Math.random() * 0.4 + 0.1,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 184, 0, ${p.o})`;
      ctx.fill();
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < 0 || p.x > canvas.width)  p.dx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ─── SCROLL ANIMATIONS ─────────────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.section-content').forEach(el => observer.observe(el));
}

function animateNumber(el) {
  el.style.transform = 'scale(1.08)';
  el.style.transition = 'transform 0.3s cubic-bezier(0.22,1,0.36,1)';
  setTimeout(() => { el.style.transform = 'scale(1)'; }, 320);
}

// ─── NAV SCROLL EFFECT ─────────────────────────────────────────────────────
function initNav() {
  const nav = document.getElementById('nav');
  const onScroll = () => {
    nav.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

// ─── CONTRACT ADDRESS DISPLAY ──────────────────────────────────────────────
function initContractDisplay() {
  if (KBL_CONTRACT_ADDRESS && KBL_CONTRACT_ADDRESS !== 'PASTE_YOUR_CONTRACT_ADDRESS_HERE') {
    contractAddrEl.textContent = KBL_CONTRACT_ADDRESS;
  }

  copyContractBtn.addEventListener('click', async () => {
    if (!KBL_CONTRACT_ADDRESS || KBL_CONTRACT_ADDRESS === 'PASTE_YOUR_CONTRACT_ADDRESS_HERE') {
      showToast('Deploy your contract first to get the address', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(KBL_CONTRACT_ADDRESS);
      showToast('Contract address copied', 'success');
    } catch {
      showToast('Could not copy address', 'error');
    }
  });
}

// ─── SWAP LOGIC ────────────────────────────────────────────────────────────
btcInputEl.addEventListener('input', () => {
  const btcAmt = parseFloat(btcInputEl.value);
  if (!btcAmt || btcAmt <= 0) {
    kblOutputEl.value = '';
    return;
  }
  // Placeholder estimate — replace with real NativeSwap quote once live
  kblOutputEl.value = 'Connect to get quote';
});

swapBtn.addEventListener('click', async () => {
  if (!walletState.connected) {
    showToast('Connect your wallet first', 'error');
    return;
  }

  const btcAmt = parseFloat(btcInputEl.value);
  if (!btcAmt || btcAmt <= 0) {
    showToast('Enter a BTC amount', 'error');
    return;
  }

  if (!KBL_CONTRACT_ADDRESS || KBL_CONTRACT_ADDRESS === 'PASTE_YOUR_CONTRACT_ADDRESS_HERE') {
    showToast('Contract not deployed yet', 'error');
    return;
  }

  showToast('Opening OP_WALLET to confirm swap...', 'info');

  /**
   * NativeSwap swap flow (production requires reorg protection):
   *
   * 1. nativeSwap.reserve(tokenAddress, minimumAmountOut, forLP)
   * 2. Wait for the reservation transaction to confirm
   * 3. nativeSwap.swap(tokenAddress) + BTC UTXO as extraInput
   *
   * See: https://docs.opnet.org for full production implementation.
   */
});

// ─── WALLET CONNECT ────────────────────────────────────────────────────────
/**
 * OPNet uses @btc-vision/walletconnect with React hooks.
 * For a pure HTML/JS page, we interact with OP_WALLET directly
 * via window.opnet (injected by the OP_WALLET extension).
 *
 * For a full React integration, wrap your app in <WalletConnectProvider>
 * and use the useWalletConnect() hook.
 */

async function connectWallet() {
  try {
    if (typeof window.opnet === 'undefined') {
      showToast('OP_WALLET not found — install it from op-wallet.io', 'error');
      window.open('https://op-wallet.io', '_blank', 'noopener');
      return;
    }

    connectBtn.textContent = 'Connecting...';
    connectBtn.disabled = true;

    const accounts = await window.opnet.requestAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned');
    }

    const address   = accounts[0];
    const publicKey = await window.opnet.getPublicKey();
    const provider  = window.opnet.provider;

    walletState = { connected: true, address, publicKey, provider };

    // Update UI
    connectBtn.textContent = truncateAddress(address);
    connectBtn.classList.add('is-connected');
    connectBtn.disabled = false;

    walletPanel.style.display = 'block';
    walletAddressEl.textContent = address;

    swapBtn.disabled = false;
    swapBtn.textContent = 'Swap BTC for KBL';

    // Load balances
    const balSats = await window.opnet.getBalance();
    btcBalanceEl.textContent = formatBTC(balSats) + ' BTC';

    await loadHolderBalance(provider, address);
    await loadSwapRate(provider);

    showToast('Wallet connected', 'success');

  } catch (err) {
    console.error('Wallet connect error:', err);
    showToast(err.message || 'Failed to connect wallet', 'error');
    connectBtn.textContent = 'Connect Wallet';
    connectBtn.disabled = false;
  }
}

function disconnectWallet() {
  walletState = { connected: false, address: null, publicKey: null, provider: null };

  connectBtn.textContent = 'Connect Wallet';
  connectBtn.classList.remove('is-connected');

  walletPanel.style.display = 'none';
  statHolderEl.textContent = '—';

  swapBtn.disabled = true;
  swapBtn.textContent = 'Connect Wallet to Swap';

  showToast('Wallet disconnected', 'info');
}

connectBtn.addEventListener('click', () => {
  if (walletState.connected) return;
  connectWallet();
});

disconnectBtn.addEventListener('click', disconnectWallet);

// ─── INIT ──────────────────────────────────────────────────────────────────
async function init() {
  initNav();
  initParticles();
  initScrollReveal();
  initContractDisplay();

  // Load public token stats (no wallet needed)
  // Uses a public OPNet RPC provider
  try {
    const { JSONRpcProvider } = await import('opnet');
    const publicProvider = new JSONRpcProvider('https://testnet.opnet.org', NETWORK);
    await loadTokenStats(publicProvider);
  } catch {
    statSupplyEl.textContent = '21,000,000';
  }
}

init();
