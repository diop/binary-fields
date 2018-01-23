const $peerList = document.querySelector('#peer-list')
const $peerID = document.querySelector('#peer-id')
const $chatNickname = document.querySelector('#chat-nickname')
const $chatMessage = document.querySelector('#chat-message')
const $chatSend = document.querySelector('#chat-send')
const $chatOutput = document.querySelector('#chat-output')

const MAX_MESSAGE_LENGTH = 255

const PUBSUB_CHANNEL = 'ipfs-test-chat-application'

const RANDOM_IPFS_REPOSITORY = false

const ipfsRepo = RANDOM_IPFS_REPOSITORY ? '/' + Math.random() : '/ipfs-chat'

const node = new Ipfs({
  config: {
    Addresses: {
      Swarm: [
        '/dns4/wrtc-star.discovery.libp2p.io/tcp/443/wss/p2p-webrtc-star'
      ]
    }
  },
  repo: ipfsRepo,

  EXPERIMENTAL: {
    pubsub: true
  }
})

const onlineNodes = {}

const nodeNicknames = {}

const appendChatMessage = (nickname, message, system) => {
  const nicknameEl = document.createElement('strong')
  nicknameEl.innerText = nickname + ': '
  const messageEl = document.createElement('span')
  messageEl.innerText = message
  const msgEl = document.createElement('div')
  msgEl.appendChild(nicknameEl)
  msgEl.appendChild(messageEl)
  if (system) {
    msgEl.style.opacity = '0.5'
  }
  $chatOutput.appendChild(msgEl)
	$chatOutput.scrollTop = $chatOutput.scrollHeight;
}

node.once('ready', () => {
  node.id((err, res) => {
      if (err) throw err
      $peerID.innerHTML = '<strong>Your Peer ID:</strong> ' + res.id
    })

node.pubsub.subscribe(PUBSUB_CHANNEL, (encodedMsg) => {
  const data = JSON.parse(encodedMsg.data.toString())

  if (data.ev === 'online') {
      if (onlineNodes[encodedMsg.from] === undefined) {
        appendChatMessage('system', `${encodedMsg.from} joined the chat`, true)
      }
      onlineNodes[encodedMsg.from] = new Date()
    }
    if (data.ev === 'message') {
      let nickname = encodedMsg.from
      if (data.nickname) {
        nickname = data.nickname
      }
      nodeNicknames[encodedMsg.from] = nickname
      appendChatMessage(nickname, data.value.substring(0, MAX_MESSAGE_LENGTH), false)
    }
  })

  const sendMessage = (msgToSend, nickname) => {
    const msg = {ev: 'message', value: msgToSend, nickname}
    const msgEncoded = node.types.Buffer.from(JSON.stringify(msg))
    node.pubsub.publish(PUBSUB_CHANNEL, msgEncoded)
    currentMessage = ''
    $chatMessage.value = ''
  }

  let currentMessage = ''
    let currentNickname = null

    $chatNickname.addEventListener('keyup', (ev) => {
    currentNickname = ev.target.value.trim().substring(0, 32)
  })

  $chatMessage.addEventListener('keyup', (ev) => {
    currentMessage = ev.target.value.trim().substring(0, MAX_MESSAGE_LENGTH)
    if (ev.keyCode === 13) {
      sendMessage(currentMessage, currentNickname)
    }
  })


  $chatSend.addEventListener('click', () => {
      sendMessage(currentMessage, currentNickname)
    })

    setInterval(() => {
    const msg = {ev: 'online'}
    const msgEncoded = node.types.Buffer.from(JSON.stringify(msg))
    node.pubsub.publish(PUBSUB_CHANNEL, msgEncoded)
  }, 1000)

  })

  setInterval(() => {
  const peers = Object.keys(onlineNodes)
  $peerList.innerHTML = '<div><strong>Online Nodes</strong> ('+peers.length+')</div>'
  peers.sort().forEach((peerID) => {
    let nickname = peerID
    if (nodeNicknames[peerID]) {
      nickname = nodeNicknames[peerID]
    }
    const timeLastSaw = onlineNodes[peerID]
    const diff = (new Date() - timeLastSaw) / 1000
    if (diff > 5) {
      delete onlineNodes[peerID]
      appendChatMessage('system', `${nickname} left the chat`, true)
      return
    }
    const el = document.createElement('div')
    el.innerText = nickname + ' Last seen: ' + diff + ' seconds ago'
    $peerList.appendChild(el)
  })
}, 1000)
