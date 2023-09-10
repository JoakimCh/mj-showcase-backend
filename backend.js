
const log = console.log
const debug = (Deno.env.get('DEBUG') ? log : undefined)
const LOCAL = Deno.env.get('LOCAL')

const port = 63172, hostname = '0.0.0.0'

function timeoutPromise(timeout = 1000, value) {
  return new Promise(resolve => setTimeout(resolve, timeout, value))
}

const listener = LOCAL ? Deno.listen({port, hostname}) : Deno.listenTls({port, hostname})
for await(const conn of listener) { // for each new TCP connection
  tcpConnectionHandler(conn) // handle it async
}

async function tcpConnectionHandler(conn) {
  try {
    debug?.('new connection')
    const httpConn = Deno.serveHttp(conn)
    for await (const {request, respondWith} of httpConn) {
      httpRequestHandler(request, respondWith) // handle it async
    }
    debug?.('httpCon closed')
  } catch (error) {
    debug?.('connection error:', error)
    try {
      conn.close()
    } catch (error) {
      debug?.('close error:', error)
    }
  }
}

async function httpRequestHandler(request, respondWith) {
  try {
    let response
    const url = new URL(request.url)
    debug?.('request:', url.toString())
    if (url.pathname == '/api') {
      if (request.headers.get('upgrade') != 'websocket') {
        debug?.('upgrade != websocket')
        response = new Response(null, {status: 404})
      } else {
        debug?.('upgradeWebSocket')
        const {socket: ws, response: upgradeResponse} = Deno.upgradeWebSocket(request)
        response = upgradeResponse
        ws.onopen = () => ws.send('Hello!')
      }
    } else {
      response = new Response(null, {status: 404})
    }
    await respondWith(response) // awaited so that errors will be caught
    debug?.('response finished')
  } catch (error) {
    debug?.('serve error:', error)
  }
}
