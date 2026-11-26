// Validated theme data only: never accept CSS, HTML or remote font URLs.
export const DEFAULT_THEME = Object.freeze({primary:'#336699',secondary:'#0C59A0',topRight:'#53D4FE',bottomLeft:'#0C59A0',background:'#F8FBFF',panel:'#FFFFFF',text:'#102033',muted:'#607086',border:'#D8E5F4',scrollbar:'#0761B3',font:'Ubuntu'});
export const FONT_STACKS = Object.freeze({Ubuntu:'Ubuntu, Arial, sans-serif',Arial:'Arial, Helvetica, sans-serif',Helvetica:'Helvetica, Arial, sans-serif',Verdana:'Verdana, Geneva, sans-serif',Tahoma:'Tahoma, Geneva, sans-serif',Georgia:'Georgia, serif',Trebuchet:'"Trebuchet MS", sans-serif',Times:'"Times New Roman", serif',System:'system-ui, sans-serif',Inter:'Inter, system-ui, sans-serif',Roboto:'Roboto, Arial, sans-serif',Montserrat:'Montserrat, Arial, sans-serif',Lato:'Lato, Arial, sans-serif','Open Sans':'"Open Sans", Arial, sans-serif',Poppins:'Poppins, Arial, sans-serif',Nunito:'Nunito, Arial, sans-serif',Raleway:'Raleway, Arial, sans-serif','DM Sans':'"DM Sans", Arial, sans-serif','Playfair Display':'"Playfair Display", Georgia, serif'});
const WEB_FONTS=new Set(['Inter','Roboto','Montserrat','Lato','Open Sans','Poppins','Nunito','Raleway','DM Sans','Playfair Display']);
export function themeFontUrl(font){return WEB_FONTS.has(font)?`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g,'+')}:wght@400;500;600;700;800&display=swap`:null;}
export const COLOR_KEYS = Object.freeze(Object.keys(DEFAULT_THEME).filter(k=>k!=='font'));
const hex=/^#[0-9a-fA-F]{6}$/;
export function luminance(c){return [1,3,5].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);}
export function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function validateTheme(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Choose a valid theme.');
 const result={};for(const k of COLOR_KEYS){if(typeof value[k]!=='string'||!hex.test(value[k]))throw new Error(`Invalid colour: ${k}. Use six-digit hex colours.`);result[k]=value[k].toUpperCase();}
 if(typeof value.font!=='string'||!Object.hasOwn(FONT_STACKS,value.font))throw new Error('Choose a supported font.');result.font=value.font;
 for(const k of ['primary','secondary'])if(contrast(result[k],'#FFFFFF')<4.5||contrast(result[k],result.panel)<4.5||contrast(result[k],result.background)<4.5)throw new Error(`${k} must have readable contrast against white and your backgrounds.`);
 for(const k of ['text','muted'])for(const b of ['panel','background'])if(contrast(result[k],result[b])<4.5)throw new Error(`${k} needs more contrast against ${b}.`);
 return result;
}
export function themeVariables(theme){const t=validateTheme(theme);return {'--zw-blue':t.primary,'--zw-blue-deep':t.primary,'--zw-secondary':t.secondary,'--ink':t.text,'--muted':t.muted,'--panel':t.panel,'--line':t.border,'--zw-blue-soft':`color-mix(in srgb, ${t.primary} 13%, ${t.panel})`,'--zw-sky':`color-mix(in srgb, ${t.primary} 6%, ${t.panel})`,'--shadow':`0 22px 70px color-mix(in srgb, ${t.primary} 13%, transparent)`,'--zb-theme-bg':t.background,'--zb-theme-panel':t.panel,'--zb-theme-primary':t.primary,'--zb-theme-secondary':t.secondary,'--zb-theme-top':t.topRight,'--zb-theme-bottom':t.bottomLeft,'--zb-theme-text':t.text,'--zb-theme-muted':t.muted,'--zb-theme-border':t.border,'--zb-theme-scroll':t.scrollbar,'--zb-theme-font':FONT_STACKS[t.font]};}
