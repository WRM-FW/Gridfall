// Go difficulty benchmark: random 2-stone star opening, alternating colors.
// Usage: node go-bench.mjs --size 9 --low 3 --high 5 --games 20 --port 9460
import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map(s => s.replace(/^--/, '').split('=')));
const size = Number(args.size || 9);
const low = Number(args.low || 1);
const high = Number(args.high || 2);
const games = Number(args.games || 20);
const port = Number(args.port || 9460);
const play = pathToFileURL(path.resolve(import.meta.dirname, '..', 'games', 'board-club', 'index.html')).href;

const b = await launch(play, { port });
try {
  const r = await b.evaluate(`(() => {
    var SIZE=${size}, LOW=${low}, HIGH=${high}, GAMES=${games};
    var stars = SIZE>=17
      ? [[3,3],[3,9],[3,15],[9,3],[9,9],[9,15],[15,3],[15,9],[15,15]]
      : (SIZE>=11
        ? [[3,3],[3,9],[9,3],[9,9],[6,6],[3,6],[6,3],[6,9],[9,6]]
        : [[2,2],[2,6],[6,2],[6,6],[4,4],[2,4],[4,2],[4,6],[6,4]]);
    function game(blackLevel, whiteLevel){
      var n=SIZE, bd=wEmptyBoard(n), history=[], turn=1, passes=0, lastMove=null, prevHash=null, moves=0, times=[];
      var pool=stars.slice().sort(function(){return Math.random()-0.5;});
      var b0=pool[0], w0=pool[1];
      bd[b0[0]][b0[1]]=1; history.push({r:b0[0],c:b0[1],color:1,captured:0,prevHashBefore:null});
      var afterBlack=wHash(bd,n);
      bd[w0[0]][w0[1]]=2; history.push({r:w0[0],c:w0[1],color:2,captured:0,prevHashBefore:afterBlack});
      prevHash=afterBlack; lastMove=w0; moves=2;
      for(var step=0; step<900 && passes<2; step++){
        var lv=turn===1?blackLevel:whiteLevel;
        var fake={size:n,board:bd,turn:turn,level:lv,history:history,lastMove:lastMove,prevHash:prevHash,playerColor:1};
        var t0=performance.now();
        var mv=goAI(fake);
        times.push(performance.now()-t0);
        if(mv==='pass'){ history.push({pass:true,color:turn}); passes++; lastMove=null; prevHash=wHash(bd,n); }
        else {
          var res=wTryPlay(bd,n,mv[0],mv[1],turn,prevHash);
          if(!res) return {error:'illegal',level:lv,move:mv};
          var before=wHash(bd,n);
          bd=res.board; history.push({r:mv[0],c:mv[1],color:turn,captured:res.captured,prevHashBefore:before});
          passes=0; lastMove=mv; prevHash=before;
        }
        moves++; turn=turn===1?2:1;
      }
      var sc=wScore(bd,n);
      return {winner:sc.winner,diff:sc.diff,moves:moves,maxMs:Math.max.apply(null,times),avgMs:times.reduce(function(a,b){return a+b;},0)/times.length};
    }
    var highWins=0, total=0, byColor={white:{w:0,n:0},black:{w:0,n:0}}, maxMs=0, sumMs=0, cnt=0, details=[];
    for(var i=0;i<GAMES;i++){
      var highIsWhite=i%2===0;
      var g=game(highIsWhite?LOW:HIGH, highIsWhite?HIGH:LOW);
      if(g.error) return g;
      var won=(highIsWhite&&g.winner===2)||(!highIsWhite&&g.winner===1);
      if(won) highWins++;
      total++;
      byColor[highIsWhite?'white':'black'].n++;
      if(won) byColor[highIsWhite?'white':'black'].w++;
      if(g.maxMs>maxMs) maxMs=g.maxMs;
      sumMs+=g.avgMs; cnt++;
      details.push({highColor:highIsWhite?'white':'black',winner:g.winner,diff:g.diff,moves:g.moves});
    }
    return {size:SIZE,low:LOW,high:HIGH,games:total,highWins,rate:highWins/total,byColor:byColor,maxMs:Math.round(maxMs),avgMs:Math.round(sumMs/cnt),details:details};
  })()`);
  console.log(JSON.stringify(r));
} finally { await b.close(); }