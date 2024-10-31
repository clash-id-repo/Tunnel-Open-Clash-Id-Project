import { connect } from 'cloudflare:sockets';
const listProxy = [
    { path: '/akamai', proxy: '172.232.238.169' },
    { path: '/kr', proxy: '52.141.25.42'},
    { path: '/us', proxy: '91.186.208.191'},
    { path: '/gcp', proxy: '34.34.217.201' },
    { path: '/do', proxy: '188.166.255.195' },
    { path: '/do2', proxy: '143.198.213.197' },
    { path: '/incapsula', proxy: '45.60.186.91' },
    { path: '/ovh', proxy: '15.235.162.49' },
];
let proxyIP;
export default {
    async fetch(request, ctx) {
      try {
        proxyIP = proxyIP;
        const url = new URL(request.url);
        const upgradeHeader = request.headers.get('Upgrade');
        for (const entry of listProxy) {
          if (url.pathname === entry.path) {
            proxyIP = entry.proxy;
            break;
          }
        }
        if (upgradeHeader === 'websocket' && proxyIP) {
          return await vlessOverWSHandler(request);
        }
        const allConfig = await getAllConfigVless(request.headers.get('Host'));
        return new Response(allConfig, {
          status: 200,
          headers: { "Content-Type": "text/html;charset=utf-8" },
        });
      } catch (err) {
        return new Response(err.toString(), { status: 500 });
      }
    },
  };
async function getAllConfigVless(hostName) {
    try {
        let vlessConfigs = '';
        let clashConfigs = '';
        for (const entry of listProxy) {
            const { path, proxy } = entry;
            const response = await fetch(`http://ip-api.com/json/${proxy}`);
            const data = await response.json();
            const pathFixed = encodeURIComponent(path);
            const vlessTls = `vless://${generateUUIDv4()}\u0040${hostName}:443?encryption=none&security=tls&sni=${hostName}&type=ws&host=${hostName}&path=${pathFixed}#${data.isp} (${data.countryCode})`;
            const vlessNtls = `vless://${generateUUIDv4()}\u0040${hostName}:80?path=${pathFixed}&security=none&encryption=none&host=${hostName}&type=ws&sni=${hostName}#${data.isp} (${data.countryCode})`;
            const vlessTlsFixed = vlessTls.replace(/ /g, '+');
            const vlessNtlsFixed = vlessNtls.replace(/ /g, '+');
            const clashConfTls = 
`- name: ${data.isp} (${data.countryCode})
  server: ${hostName}
  port: 443
  type: vless
  uuid: ${generateUUIDv4()}
  cipher: auto
  tls: true
  skip-cert-verify: true
  network: ws
  servername: ${hostName}
  ws-opts:
    path: ${path}
    headers:
      Host: ${hostName}
  udp: true`;
             const clashConfNtls =
`- name: ${data.isp} (${data.countryCode})
  server: ${hostName}
  port: 80
  type: vless
  uuid: ${generateUUIDv4()}
  cipher: auto
  tls: false
  skip-cert-verify: true
  network: ws
  ws-opts:
    path: ${path}
    headers:
      Host: ${hostName}
  udp: true`;
            clashConfigs += `
<div style="display: none;">
   <textarea id="clashTls${path}">${clashConfTls}</textarea>
 </div>
<div style="display: none;">
   <textarea id="clashNtls${path}">${clashConfNtls}</textarea>
 </div>
<div class="config-section" style="background-color: rgba(10, 10, 10, 0.8); color: #00ff00; border: 2px solid #00ff00;">
    <p style="color: #00ff00;"><strong>ISP:</strong> ${data.isp} (${data.countryCode})</p>
    <hr style="border-color: #00ff00; width: 100%; margin-left: auto; margin-right: auto;" />
    <div class="config-toggle">
        <button class="button" onclick="toggleConfig(this, 'Tap Here To Show Configurations', 'Tap Here To Hide')">Tap Here To Show Configurations</button>
        <div class="config-content">
            <div class="config-block" style="background-color: rgba(0, 0, 0, 0.3);">
                <h3 style="color: #00ff00;">TLS:</h3>
                <p class="config">${clashConfTls}</p>
                <button class="button" onclick='copyClash("clashTls${path}")'><i class="fa fa-clipboard"></i>Copy</button>
            </div>
            <hr style="border-color: #00ff00; width: 75%; margin-left: auto; margin-right: auto;" />
            <div class="config-block" style="background-color: rgba(0, 0, 0, 0.3);">
                <h3 style="color: #00ff00;">NTLS:</h3>
                <p class="config">${clashConfNtls}</p>
                <button class="button" onclick='copyClash("clashNtls${path}")'><i class="fa fa-clipboard"></i>Copy</button>
            </div>
        </div>
    </div>
</div>
<hr class="config-divider" style="background: linear-gradient(to right, transparent, #00ff00, transparent); margin: 40px 0;" />
`;

vlessConfigs += `
<div class="config-section" style="background-color: rgba(10, 10, 10, 0.8); color: #00ff00; border: 2px solid #00ff00;">
    <p style="color: #00ff00;"><strong>ISP:</strong> ${data.isp} (${data.countryCode})</p>
    <hr style="border-color: #00ff00; width: 100%; margin-left: auto; margin-right: auto;" />
    <div class="config-toggle">
        <button class="button" onclick="toggleConfig(this, 'Tap Here To Show Account', 'Tap Here To Hide')">Tap Here To Show Account</button>
        <div class="config-content">
            <div class="config-block" style="background-color: rgba(0, 0, 0, 0.3);">
                <h3 style="color: #00ff00;">TLS:</h3>
                <p class="config" style="color: #00ff00;">${vlessTlsFixed}</p>
                <button class="button" onclick='copyToClipboard("${vlessTlsFixed}")'><i class="fa fa-clipboard"></i>Copy</button>
            </div>
            <hr style="border-color: #00ff00; width: 75%; margin-left: auto; margin-right: auto;" />
            <div class="config-block" style="background-color: rgba(0, 0, 0, 0.3);">
                <h3 style="color: #00ff00;">NTLS:</h3>
                <p class="config" style="color: #00ff00;">${vlessNtlsFixed}</p>
                <button class="button" onclick='copyToClipboard("${vlessNtlsFixed}")'><i class="fa fa-clipboard"></i>Copy</button>
            </div>
        </div>
    </div>
</div>
<hr class="config-divider" style="background: linear-gradient(to right, transparent, #00ff00, transparent); margin: 40px 0;" />
`;
}
        const htmlConfigs = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CLOUDFLARE PROXY</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css" integrity="sha512-Fo3rlrZj/k7ujTnHg4C+6PCWJ+8zzHcXQjXGp6n5Yh9rX0x5fOdPaOqO+e2X4R5C1aE/BSqPIG+8y3O6APa8w==" crossorigin="anonymous" referrerpolicy="no-referrer" />
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
        body {
    margin: 0;
    padding: 0;
    font-family: 'Roboto', monospace;
    background-color: #0c0c0c;
    color: #00ff00;
    display: flex;
    flex-direction: column;
    height: 100vh;
}
.container {
    height: 100%;
    width: 100%;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 0;
    padding: 30px;
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    animation: fadeIn 1s ease-in-out;
    overflow-y: auto;
    box-sizing: border-box;
}
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: -1;
        }
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
        }
.header {
    text-align: center;
    margin-bottom: 20px;
        }
.profile-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
		}
.profile-pic {
    width: 200px;
    height: 200px;
    border-radius: 50%;
    box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
    margin: 0;
		}
.profile-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
}
.profile-name {
    color: #00ff00;
    font-size: 20px;
    text-align: center;
    margin-top: 30px;
    margin-bottom: 3px;
    text-shadow: 0 0 5px rgba(0, 255, 0, 0.7);
}
.header h1 {
    font-size: 24px;
    text-align: center;
    text-transform: uppercase;
    margin: 0;
    text-shadow: 0 0 10px #00ff00;
        }
.nav-buttons {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
    gap: 20px;
        }
.nav-buttons .button {
    background-color: transparent;
    border: 2px solid #00ff00;
    color: #00ff00;
    padding: 6px 12px;
    font-size: 10px;
    border-radius: 0;
    cursor: pointer;
    transition: all 0.3s ease;
    text-transform: uppercase;
    letter-spacing: 1px;
        }
.nav-buttons .button:hover {
    background-color: #00ff00;
    color: black;
    transform: scale(1.05);
        }
.content {
    display: none;
        }
.content.active {
    display: block;
        }
.config-section {
    background: rgba(255, 255, 255, 0.1);
    padding: 10px;
    margin-bottom: 20px;
    position: relative;
    animation: slideIn 0.5s ease-in-out;
        }
@keyframes slideIn {
    from { transform: translateX(-30px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
        }
.config-section h3 {
    margin-top: 0;
    color: #00ff00; 
    font-size: 28px;
        }
.config-section p {
    color: #00ff00;
    font-size: 16px;
        }
.config-toggle {
    margin-bottom: 20px;
        }
.config-content {
    display: none;
        }
.config-content.active {
    display: block;
        }
.config-block {
    margin-bottom: 20px;
    padding: 15px;
    background-color: rgba(0, 0, 0, 0.3);
    transition: background-color 0.3s ease;
        }
.config-block h4 {
    margin-bottom: 8px;
    color: #00ff00; 
    font-size: 22px;
    font-weight: 600;
        }
.config {
    background-color: rgba(0, 0, 0, 0.4);
    padding: 10px;
    border-radius: 0;
    border: 1px solid #00ff00;
    color: #f5f5f5;
    word-wrap: break-word;
    white-space: pre-wrap;
    font-family: 'Courier New', Courier, monospace;
    font-size: 15px;
        }
.button {
    background-color: transparent;
    color: #00ff00;
    border: 2px solid #00ff00;
    padding: 10px 20px;
    margin: 10px;
    cursor: pointer;
    transition: all 0.3s ease;
        }
.button i {
    margin-right: 3px;
        }
.button:hover {
    background-color: #00ff00;
    color: black;
        }
.config-divider {
    border: none;
    height: 1px;
    background: linear-gradient(to right, transparent, #00ff00, transparent);
    margin: 40px 0;
        }
@media (max-width: 768px) {
    .header h1 {
        font-size: 28px;
    }
    .config-section h3 {
        font-size: 24px;
    }
    .config-block h4 {
        font-size: 20px;
    }
        }
    </style>
</head>
<body>
    <div class="overlay"></div>
    <div class="container">
        <div class="header">
            <div class="profile-container">
				<img src="https://avatars.githubusercontent.com/u/61716582?v=4" alt="VLESS CLOUDFLARE" class="profile-pic">
				<h2 class="profile-name">SONZAIX VLESS</h2>
			</div>
        </div>
        <div class="nav-buttons">
            <button class="button" onclick="showContent('vless')">VLESS MENU</button>
            <button class="button" onclick="showContent('clash')">CLASH MENU</button>
			<button class="button" onclick="showContent('info')">INFO</button>
        </div>
        <div id="vless" class="content active">
            ${vlessConfigs}
        </div>
        <div id="clash" class="content">
            ${clashConfigs}
        </div>
		<div id="info" class="content">
			<p>Workers ini baru support wildcard <strong>support.zoom.us</strong></p>
			<p>Jika kalian ingin menambah domain agar support wildcard di vless ini, silakan chat di Telegram: <a href="https://t.me/November2k" target="_blank" style="color: #00ff00; text-decoration: none;">Sonzai X シ</a></p>
			<!-- Tambahkan tombol CHAT di sini -->
			<a href="https://t.me/november2k" target="_blank">
				<button class="button" style="margin-top: 10px;">CHAT</button>
			</a>
		</div>
    </div>

    <script>
        function showContent(contentId) {
            const contents = document.querySelectorAll('.content');
            contents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(contentId).classList.add('active');
        }
        function salinTeks() {
            var teks = document.getElementById('teksAsli');
            teks.select();
            document.execCommand('copy');
            alert('Teks telah disalin.');
        }
        function copyClash(elementId) {
            const text = document.getElementById(elementId).textContent;
            navigator.clipboard.writeText(text)
            .then(() => {
                const alertBox = document.createElement('div');
                alertBox.textContent = "Copied to clipboard!";
                alertBox.style.position = 'fixed';
                alertBox.style.bottom = '20px';
                alertBox.style.right = '20px';
                alertBox.style.backgroundColor = 'green';
                alertBox.style.color = '#fff';
                alertBox.style.padding = '10px 20px';
                alertBox.style.borderRadius = '5px';
                alertBox.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                alertBox.style.opacity = '0';
                alertBox.style.transition = 'opacity 0.5s ease-in-out';
                document.body.appendChild(alertBox);
                setTimeout(() => {
                    alertBox.style.opacity = '1';
                }, 100);
                setTimeout(() => {
                    alertBox.style.opacity = '0';
                    setTimeout(() => {
                        document.body.removeChild(alertBox);
                    }, 500);
                }, 2000);
            })
            .catch((err) => {
                console.error("Failed to copy to clipboard:", err);
            });
        }
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    const alertBox = document.createElement('div');
                    alertBox.textContent = "Copied to clipboard!";
                    alertBox.style.position = 'fixed';
                    alertBox.style.bottom = '20px';
                    alertBox.style.right = '20px';
                    alertBox.style.backgroundColor = 'green';
                    alertBox.style.color = '#fff';
                    alertBox.style.padding = '10px 20px';
                    alertBox.style.borderRadius = '5px';
                    alertBox.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                    alertBox.style.opacity = '0';
                    alertBox.style.transition = 'opacity 0.5s ease-in-out';
                    document.body.appendChild(alertBox);
                    setTimeout(() => {
                        alertBox.style.opacity = '1';
                    }, 100);
                    setTimeout(() => {
                        alertBox.style.opacity = '0';
                        setTimeout(() => {
                            document.body.removeChild(alertBox);
                        }, 500);
                    }, 2000);
                })
                .catch((err) => {
                    console.error("Failed to copy to clipboard:", err);
                });
        }

        function toggleConfig(button, show, hide) {
            const configContent = button.nextElementSibling;
            if (configContent.classList.contains('active')) {
                configContent.classList.remove('active');
                button.textContent = show;
            } else {
                configContent.classList.add('active');
                button.textContent = hide;
            }
        }
    </script>
</body>
</html>`;
        return htmlConfigs;
    } catch (error) {
        return `An error occurred while generating the VLESS configurations. ${error}`;
    }
}
function generateUUIDv4() {
  const randomValues = crypto.getRandomValues(new Uint8Array(16));
  randomValues[6] = (randomValues[6] & 0x0f) | 0x40;
  randomValues[8] = (randomValues[8] & 0x3f) | 0x80;
  return [
    randomValues[0].toString(16).padStart(2, '0'),
    randomValues[1].toString(16).padStart(2, '0'),
    randomValues[2].toString(16).padStart(2, '0'),
    randomValues[3].toString(16).padStart(2, '0'),
    randomValues[4].toString(16).padStart(2, '0'),
    randomValues[5].toString(16).padStart(2, '0'),
    randomValues[6].toString(16).padStart(2, '0'),
    randomValues[7].toString(16).padStart(2, '0'),
    randomValues[8].toString(16).padStart(2, '0'),
    randomValues[9].toString(16).padStart(2, '0'),
    randomValues[10].toString(16).padStart(2, '0'),
    randomValues[11].toString(16).padStart(2, '0'),
    randomValues[12].toString(16).padStart(2, '0'),
    randomValues[13].toString(16).padStart(2, '0'),
    randomValues[14].toString(16).padStart(2, '0'),
    randomValues[15].toString(16).padStart(2, '0')
].join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-$3-$4-$5');
}
async function vlessOverWSHandler(request) {
	const webSocketPair = new WebSocketPair();
	const [client, webSocket] = Object.values(webSocketPair);
	webSocket.accept();
	let address = '';
	let portWithRandomLog = '';
	const log = (info, event) => {
		console.log(`[${address}:${portWithRandomLog}] ${info}`, event || '');
	};
	const earlyDataHeader = request.headers.get('sec-websocket-protocol') || '';
	const readableWebSocketStream = makeReadableWebSocketStream(webSocket, earlyDataHeader, log);
	let remoteSocketWapper = {
		value: null,
	};
	let udpStreamWrite = null;
	let isDns = false;
	readableWebSocketStream.pipeTo(new WritableStream({
		async write(chunk, controller) {
			if (isDns && udpStreamWrite) {
				return udpStreamWrite(chunk);
			}
			if (remoteSocketWapper.value) {
				const writer = remoteSocketWapper.value.writable.getWriter()
				await writer.write(chunk);
				writer.releaseLock();
				return;
			}
			const {
				hasError,
				message,
				portRemote = 443,
				addressRemote = '',
				rawDataIndex,
				vlessVersion = new Uint8Array([0, 0]),
				isUDP,
			} = processVlessHeader(chunk);
			address = addressRemote;
			portWithRandomLog = `${portRemote}--${Math.random()} ${isUDP ? 'udp ' : 'tcp '
				} `;
			if (hasError) {
				throw new Error(message); 
				return;
			}
			if (isUDP) {
				if (portRemote === 53) {
					isDns = true;
				} else {
					throw new Error('UDP proxy only enable for DNS which is port 53');
					return;
				}
			}
			const vlessResponseHeader = new Uint8Array([vlessVersion[0], 0]);
			const rawClientData = chunk.slice(rawDataIndex);
			if (isDns) {
				const { write } = await handleUDPOutBound(webSocket, vlessResponseHeader, log);
				udpStreamWrite = write;
				udpStreamWrite(rawClientData);
				return;
			}
			handleTCPOutBound(remoteSocketWapper, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log);
		},
		close() {
			log(`readableWebSocketStream is close`);
		},
		abort(reason) {
			log(`readableWebSocketStream is abort`, JSON.stringify(reason));
		},
	})).catch((err) => {
		log('readableWebSocketStream pipeTo error', err);
	});

	return new Response(null, {
		status: 101,
		webSocket: client,
	});
}
async function handleTCPOutBound(remoteSocket, addressRemote, portRemote, rawClientData, webSocket, vlessResponseHeader, log,) {
	async function connectAndWrite(address, port) {
		const tcpSocket = connect({
			hostname: address,
			port: port,
		});
		remoteSocket.value = tcpSocket;
		log(`connected to ${address}:${port}`);
		const writer = tcpSocket.writable.getWriter();
		await writer.write(rawClientData);
		writer.releaseLock();
		return tcpSocket;
	}
	async function retry() {
		const tcpSocket = await connectAndWrite(proxyIP || addressRemote, portRemote)
		tcpSocket.closed.catch(error => {
			console.log('retry tcpSocket closed error'
