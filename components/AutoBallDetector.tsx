import React, { useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

export type DetectedPoint = { x: number; y: number; frame: number };

export type DetectionResult = {
  stumps: {
    offBase: { x: number; y: number };
    legBase: { x: number; y: number };
    bailTop: { x: number; y: number };
    widthPx: number;
    heightPx: number;
    centerX: number;
    widthInches?: number;
    heightInches?: number;
  } | null;
  ballPositions: DetectedPoint[];
  pitchPoint: DetectedPoint | null;
  impactPoint: DetectedPoint | null;
  releasePoint: DetectedPoint | null;
  detectedHand?: 'RH' | 'LH';
};

export type AutoBallDetectorRef = {
  processFrames: (base64Frames: string[], frameW: number, frameH: number) => Promise<DetectionResult>;
};

const DETECTOR_HTML = `
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0}canvas{display:none}</style></head><body>
<canvas id="c"></canvas><canvas id="prev"></canvas><canvas id="diff"></canvas>
<script>
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const prevCanvas=document.getElementById('prev'),prevCtx=prevCanvas.getContext('2d',{willReadFrequently:true});
const diffCanvas=document.getElementById('diff'),diffCtx=diffCanvas.getContext('2d',{willReadFrequently:true});

function rgbToHsl(r,g,b){r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
let h,s,l=(mx+mn)/2;if(mx===mn){h=s=0}else{const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);
switch(mx){case r:h=((g-b)/d+(g<b?6:0))/6;break;case g:h=((b-r)/d+2)/6;break;case b:h=((r-g)/d+4)/6;break}}
return[h*360,s*100,l*100]}

function detectStumps(imgData,w,h){
  const colBright=new Float32Array(w);
  const startY=Math.floor(h*0.3),endY=Math.floor(h*0.85);
  for(let x=0;x<w;x++){let count=0;
    for(let y=startY;y<endY;y++){const i=(y*w+x)*4;
      const r=imgData[i],g=imgData[i+1],b=imgData[i+2];
      const[hue,sat,lum]=rgbToHsl(r,g,b);
      if(lum>65&&sat<35)count++}
    colBright[x]=count/(endY-startY)}
  // find vertical bright columns
  const threshold=0.15;const peaks=[];
  for(let x=2;x<w-2;x++){
    if(colBright[x]>threshold){
      const avg=(colBright[x-1]+colBright[x]+colBright[x+1])/3;
      if(avg>threshold)peaks.push({x,val:avg})}}
  if(peaks.length<2)return null;
  // cluster peaks
  const clusters=[];let cl=[peaks[0]];
  for(let i=1;i<peaks.length;i++){
    if(peaks[i].x-peaks[i-1].x<4)cl.push(peaks[i]);
    else{if(cl.length>=1)clusters.push(cl);cl=[peaks[i]]}}
  if(cl.length>=1)clusters.push(cl);
  if(clusters.length<2)return null;
  // find best group of 2-3 adjacent clusters (stumps)
  let bestGroup=null,bestScore=0;
  for(let i=0;i<clusters.length;i++){
    for(let j=i+1;j<Math.min(i+4,clusters.length);j++){
      const lx=clusters[i][0].x,rx=clusters[j][clusters[j].length-1].x;
      const gap=rx-lx;
      if(gap>w*0.02&&gap<w*0.35){
        const score=clusters[i].reduce((s,p)=>s+p.val,0)+clusters[j].reduce((s,p)=>s+p.val,0);
        if(score>bestScore){bestScore=score;bestGroup=[clusters[i],clusters[j]]}}}}
  if(!bestGroup)return null;
  const offX=bestGroup[0][Math.floor(bestGroup[0].length/2)].x;
  const legX=bestGroup[1][Math.floor(bestGroup[1].length/2)].x;
  const cx=(offX+legX)/2;
  // find stump height by scanning up from bottom
  let topY=endY;
  for(let y=startY;y<endY;y++){
    let bright=0;for(let dx=-2;dx<=2;dx++){
      const xx=Math.max(0,Math.min(w-1,Math.round(cx)+dx));
      const i=(y*w+xx)*4;const[,sat,lum]=rgbToHsl(imgData[i],imgData[i+1],imgData[i+2]);
      if(lum>60&&sat<40)bright++}
    if(bright>=2){topY=y;break}}
  const baseY=Math.floor(h*0.75);
  return{offBase:{x:offX,y:baseY},legBase:{x:legX,y:baseY},bailTop:{x:cx,y:topY},
    widthPx:Math.abs(legX-offX),heightPx:baseY-topY,centerX:cx}}

function detectBall(imgData,prevData,w,h){
  if(!prevData)return null;
  let bestX=0,bestY=0,bestScore=0,totalWeight=0;
  const step=2;
  for(let y=0;y<h;y+=step){for(let x=0;x<w;x+=step){
    const i=(y*w+x)*4;
    const dr=Math.abs(imgData[i]-prevData[i]);
    const dg=Math.abs(imgData[i+1]-prevData[i+1]);
    const db=Math.abs(imgData[i+2]-prevData[i+2]);
    const diff=(dr+dg+db)/3;
    if(diff>25){
      const r=imgData[i],g=imgData[i+1],b=imgData[i+2];
      const[hue,sat,lum]=rgbToHsl(r,g,b);
      let ballScore=diff;
      // boost red ball
      if((hue<25||hue>335)&&sat>30&&lum>20)ballScore*=2.5;
      // boost white ball
      if(sat<25&&lum>70)ballScore*=2;
      // boost bright objects
      if(lum>50)ballScore*=1.3;
      bestX+=x*ballScore;bestY+=y*ballScore;totalWeight+=ballScore}}}
  if(totalWeight<50)return null;
  return{x:bestX/totalWeight,y:bestY/totalWeight}}

function findKeyPoints(positions){
  if(positions.length<3)return{release:null,pitch:null,impact:null};
  const release=positions[0];
  // pitch point = where ball reaches lowest Y (closest to ground / max screen Y)
  let pitchIdx=0,maxY=-1;
  for(let i=1;i<positions.length-1;i++){
    if(positions[i].y>maxY){maxY=positions[i].y;pitchIdx=i}}
  const pitch=positions[pitchIdx];
  
  const afterPitch=positions.slice(pitchIdx);
  let impactIdx = afterPitch.length - 1;
  
  // Detect impact: ball hits the batsman and drops down (Y increases) or deflects sharply
  for(let i=1; i<afterPitch.length; i++){
    if(afterPitch[i].y > afterPitch[i-1].y + 1.5){
      impactIdx = i - 1;
      break;
    }
    if(i >= 2){
      let dx1 = afterPitch[i-1].x - afterPitch[i-2].x;
      let dx2 = afterPitch[i].x - afterPitch[i-1].x;
      if(dx1 * dx2 < 0 && Math.abs(dx2) > 2 && Math.abs(dx1) > 2){
        impactIdx = i - 1;
        break;
      }
    }
  }
  
  if (impactIdx < 1 && afterPitch.length > 1) impactIdx = 1;
  
  const impact=afterPitch[impactIdx];
  return{release,pitch,impact}}

let frameQueue=[];let frameW=0,frameH=0;let results=[];let prevImageData=null;

function processNext(){
  if(frameQueue.length===0){
    // all done — compute results
    const filtered=results.filter(r=>r!==null);
    const keyPts=findKeyPoints(filtered);
    // detect stumps from the last frame with data
    let stumps=null;
    if(frameQueue._lastData){
      stumps=detectStumps(frameQueue._lastData,frameW,frameH)}
    
    // Ensure we have a P1 (release) if findKeyPoints couldn't find a distinct one
    const p1 = keyPts.release || (filtered.length > 0 ? filtered[0] : null);

    // Detect Batsman Stance (Heuristic)
    // Find average X of movement at bottom of screen in impact frames
    let batsmanXSum=0, batsmanWeight=0;
    for(let i=0; i<results.length; i++){
      const r = results[i];
      if(r && r.frame > (keyPts.pitch?.frame || 0)){
        batsmanXSum += r.xAtBottom || 0;
        batsmanWeight += r.weightAtBottom || 0;
      }
    }
    let detectedHand = 'RH';
    if(stumps && batsmanWeight > 0){
      const batsmanAvgX = batsmanXSum / batsmanWeight;
      // In professional behind-the-bowler view: 
      // RH stands on the RIGHT (Leg Side, higher X)
      // LH stands on the LEFT (Leg Side, lower X)
      detectedHand = (batsmanAvgX > stumps.centerX) ? 'RH' : 'LH';
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({
      type:'done',stumps,ballPositions:filtered,
      pitchPoint:keyPts.pitch,impactPoint:keyPts.impact,releasePoint:p1,
      detectedHand
    }));
    return}
  const{src,idx}=frameQueue.shift();
  const img=new Image();
  img.onload=function(){
    canvas.width=frameW;canvas.height=frameH;
    ctx.drawImage(img,0,0,frameW,frameH);
    const data=ctx.getImageData(0,0,frameW,frameH).data;
    
    // Process Ball
    const pos=detectBall(data,prevImageData,frameW,frameH);
    
    // Analyze movements at bottom (Batsman identification)
    let xAtBottom=0, weightAtBottom=0;
    if(prevImageData){
      for(let y=Math.floor(frameH*0.6); y<frameH; y+=4){ // Look at bottom 40%
        for(let x=0; x<frameW; x+=4){
          const i=(y*frameW+x)*4;
          const diff=(Math.abs(data[i]-prevImageData[i])+Math.abs(data[i+1]-prevImageData[i+1])+Math.abs(data[i+2]-prevImageData[i+2]))/3;
          if(diff>30){
            xAtBottom += x*diff;
            weightAtBottom += diff;
          }
        }
      }
    }

    if(pos) {
      results.push({x:pos.x,y:pos.y,frame:idx,xAtBottom,weightAtBottom});
    } else {
      results.push({xAtBottom,weightAtBottom,frame:idx});
    }

    // detect stumps on last few frames (more stable)
    if(frameQueue.length<=2)frameQueue._lastData=new Uint8ClampedArray(data);
    prevImageData=new Uint8ClampedArray(data);
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'progress',frame:idx}));
    setTimeout(processNext,10)};
  img.onerror=function(){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'progress',frame:idx}));
    setTimeout(processNext,10)};
  img.src=src}

window.addEventListener('message',function(e){
  try{
    const msg=JSON.parse(e.data);
    if(msg.type==='process'){
      frameW=msg.width;frameH=msg.height;
      frameQueue=msg.frames.map((src,i)=>({src:'data:image/jpeg;base64,'+src,idx:i}));
      frameQueue._lastData=null;
      results=[];prevImageData=null;
      processNext()}}catch(err){
    window.ReactNativeWebView.postMessage(JSON.stringify({type:'error',msg:err.message}))}});
document.addEventListener('message',function(e){window.dispatchEvent(new MessageEvent('message',{data:e.data}))});
</script></body></html>`;

const AutoBallDetector = forwardRef<AutoBallDetectorRef>((_, ref) => {
  const webviewRef = useRef<WebView>(null);
  const resolveRef = useRef<((result: DetectionResult) => void) | null>(null);
  const progressRef = useRef<((frame: number) => void) | null>(null);

  const handleMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'done' && resolveRef.current) {
        resolveRef.current({
          stumps: msg.stumps,
          ballPositions: msg.ballPositions || [],
          pitchPoint: msg.pitchPoint,
          impactPoint: msg.impactPoint,
          releasePoint: msg.releasePoint,
          detectedHand: msg.detectedHand,
        });
        resolveRef.current = null;
      }
    } catch (e) { /* ignore */ }
  }, []);

  useImperativeHandle(ref, () => ({
    processFrames: (base64Frames: string[], frameW: number, frameH: number) => {
      return new Promise<DetectionResult>((resolve) => {
        resolveRef.current = resolve;
        const msg = JSON.stringify({
          type: 'process',
          frames: base64Frames,
          width: Math.min(frameW, 200),
          height: Math.min(frameH, 150),
        });
        webviewRef.current?.postMessage(msg);
        // Timeout fallback after 30s
        setTimeout(() => {
          if (resolveRef.current) {
            resolveRef.current({
              stumps: null, ballPositions: [],
              pitchPoint: null, impactPoint: null, releasePoint: null,
              detectedHand: 'RH',
            });
            resolveRef.current = null;
          }
        }, 30000);
      });
    },
  }));

  return (
    <View style={styles.hidden}>
      <WebView
        ref={webviewRef}
        source={{ html: DETECTOR_HTML }}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
        style={styles.webview}
      />
    </View>
  );
});

AutoBallDetector.displayName = 'AutoBallDetector';
export default AutoBallDetector;

const styles = StyleSheet.create({
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
  webview: { width: 1, height: 1 },
});
