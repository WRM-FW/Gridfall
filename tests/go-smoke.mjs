// 19x19 smoke: 30 moves per level, AI vs same level. Checks legality, early pass, timing.
import { launch } from './cdp.mjs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const play = pathToFileURL(path.resolve(import.meta.dirname, '..', 'games', 'board-club', 'index.html')).href;
const b = await launch(play, { port: 9461 });
try {
  const r = await b.evaluate(`(() => {
    var out=[];
    for(var lv=1; lv<=5; lv++){
      var n=19, bd=wEmptyBoard(n), turn=1, passes=0, history=[], lastMove=null, prevHash=null, moves=0, times=[], illegal=0, earlyPass=0;
      for(var step=0; step<30; step++){
        var fake={size:n,board:bd,turn:turn,level:lv,history:history,lastMove:lastMove,prevHash:prevHash,playerColor:1};
        var t0=performance.now();
        var mv=goAI(fake);
        times.push(performance.now()-t0);
        if(mv==='pass'){ earlyPass++; history.push({pass:true,color:turn}); passes++; lastMove=null; prevHash=wHash(bd,n); }
        else {
          var res=wTryPlay(bd,n,mv[0],mv[1],turn,prevHash);
          if(!res){ illegal++; break; }
          var before=wHash(bd,n);
          bd=res.board; history.push({r:mv[0],c:mv[1],color:turn,captured:res.captured,prevHashBefore:before});
          passes=0; lastMove=mv; prevHash=before;
        }
        moves++; turn=turn===1?2:1;
      }
      out.push({level:lv,moves:moves,illegal:illegal,earlyPass:earlyPass,avgMs:Math.round(times.reduce(function(a,b){return a+b;},0)/times.length),maxMs:Math.round(Math.max.apply(null,times))});
    }
    return out;
  })()`);
  console.log(JSON.stringify(r));
} finally { await b.close(); }