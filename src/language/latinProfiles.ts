/**
 * Latin-language fingerprints. Lowercase and diacritics are intentional: the
 * scorer lowercases input but keeps accents as a signal.
 *
 * These are the 21 Latin-script entries from the legacy registry. The order is
 * the registry order because ties are resolved by insertion order after the
 * stable sort in `detectLanguage()`.
 */

import type { LanguageCode, LatinProfile } from '../types';

export const LATIN_PROFILES = {
  en: {
    stop: ['the','and','is','are','was','of','to','in','it','you','that','he','she','for','on','with','as','at','this','have','from','or','be','by','not','but','they','we','my','your','what'],
    chars: '',
    ngrams: ['th','he','ing','er','an','re','on','at','en','nd','the','and','ion','tio']
  },
  de: {
    stop: ['der','die','das','und','ist','nicht','ein','eine','ich','du','er','sie','es','zu','mit','von','auf','für','den','dem','des','sich','auch','aber','wie','wir','was','wer','noch','nur','oder','haus','katze'],
    chars: 'äöüß',
    ngrams: ['sch','ich','ein','ung','der','die','und','ch','ei','en','er','st','ge','ver','lich','keit']
  },
  fr: {
    stop: ['le','la','les','de','des','et','est','un','une','je','tu','il','elle','nous','vous','ils','pas','que','qui','pour','dans','avec','sur','au','aux','ce','cette','maison','chien','être','avoir','du','en'],
    chars: 'àâçéèêëîïôùûüÿœ',
    ngrams: ['que','les','des','ent','ion','re','es','de','ai','oi','eu','au','eau','ment','tion']
  },
  es: {
    stop: ['el','la','los','las','de','del','y','es','un','una','yo','tú','él','ella','nosotros','ustedes','ellos','no','que','por','para','con','en','al','este','esta','casa','perro','ser','tener','muy','como','pero'],
    chars: 'ñáéíóúü¿¡',
    ngrams: ['que','de','os','as','es','en','el','la','ción','ión','ado','ido','ar','er','ir','mente']
  },
  it: {
    stop: ['il','lo','la','i','gli','le','di','del','e','è','un','una','io','tu','lui','lei','noi','voi','loro','non','che','per','con','su','nel','alla','questo','questa','casa','cane','essere','avere','molto','come','ma'],
    chars: 'àèéìíîòóùú',
    ngrams: ['che','gli','zione','per','del','la','il','un','re','to','ta','te','no','ni','amento','mente']
  },
  pt: {
    stop: ['o','a','os','as','de','do','da','e','é','um','uma','eu','tu','ele','ela','nós','vocês','eles','não','que','para','com','em','no','na','este','esta','casa','cão','ser','ter','muito','como','mas','ão'],
    chars: 'ãõáâàçéêíóôúü',
    ngrams: ['que','ção','não','dos','para','de','os','as','ão','ões','nh','lh','ch','mente']
  },
  nl: {
    stop: ['de','het','een','en','is','van','ik','jij','hij','zij','wij','jullie','niet','dat','dit','op','met','voor','aan','er','maar','ook','huis','hond','zijn','hebben','wat','wie','hoe'],
    chars: 'ëïé',
    ngrams: ['ij','de','het','een','van','en','er','sch','lijk','heid','ing','te','ge','ver']
  },
  sv: {
    stop: ['och','att','är','en','ett','det','de','jag','du','han','hon','vi','ni','inte','som','på','med','för','av','till','har','var','hus','hund','vara','mycket','men','eller'],
    chars: 'åäö',
    ngrams: ['och','att','är','en','et','ar','er','or','ing','het','tion','sk','st','ka']
  },
  da: {
    stop: ['og','at','er','en','et','det','de','jeg','du','han','hun','vi','I','ikke','som','på','med','for','af','til','har','var','hus','hund','være','meget','men','eller'],
    chars: 'æøå',
    ngrams: ['og','at','er','en','et','de','ing','tion','sk','st','ke','ge','be','for']
  },
  no: {
    stop: ['og','at','er','en','et','det','de','jeg','du','han','hun','vi','dere','ikke','som','på','med','for','av','til','har','var','hus','hund','være','veldig','men','eller'],
    chars: 'æøå',
    ngrams: ['og','at','er','en','et','de','ing','sjon','sk','st','ke','ge','be','for','het']
  },
  fi: {
    stop: ['ja','on','ei','se','että','hän','me','te','he','oli','ovat','kun','niin','mutta','tai','myös','talo','koira','olla','olla','paljon','kuin'],
    chars: 'äö',
    ngrams: ['nen','ssa','sta','lla','lle','ksi','ja','on','en','et','ta','tä','isto','minen']
  },
  pl: {
    stop: ['i','w','z','na','nie','to','się','jest','że','do','od','po','co','jak','ale','tak','dom','pies','być','mieć','bardzo','który','dla','przez','lub','oraz'],
    chars: 'ąćęłńóśźż',
    ngrams: ['sz','cz','rz','ie','prz','nie','owa','owe','owy','anie','enie','ść','dzi']
  },
  cs: {
    stop: ['a','v','na','se','je','to','že','do','od','po','co','jak','ale','tak','dům','pes','být','mít','velmi','který','pro','přes','nebo','ani','jsou','není'],
    chars: 'čďěňřšťůž',
    ngrams: ['ch','pr','ov','ní','te','je','se','na','ost','ství','ení','ání','čk','řk']
  },
  sk: {
    stop: ['a','v','na','sa','je','to','že','do','od','po','čo','ako','ale','tak','dom','pes','byť','mať','veľmi','ktorý','pre','cez','alebo','ani','sú','nie'],
    chars: 'äôčďĺľňŕšťž',
    ngrams: ['ch','pr','ov','ie','te','je','sa','na','osť','stvo','enie','anie','čk']
  },
  sl: {
    stop: ['in','v','na','se','je','to','da','do','od','po','kaj','kot','ali','tako','hiša','pes','biti','imeti','zelo','ki','za','skozi','ali','ter','ni'],
    chars: 'čšž',
    ngrams: ['je','in','na','se','pr','ov','ost','stvo','enje','anje','č','š','ž']
  },
  sr: {
    stop: ['i','u','na','se','je','to','da','do','od','po','što','kako','ali','tako','kuća','pas','biti','imati','veoma','koji','za','kroz','ili','nije','sam','smo','ljubav'],
    chars: 'čćđšž',
    ngrams: ['nj','lj','dj','pr','je','ov','na','se','ost','stvo','enje','anje','ić','ica']
  },
  ro: {
    stop: ['și','în','la','de','este','un','o','eu','tu','el','ea','noi','voi','ei','nu','că','pentru','cu','pe','din','casă','câine','fi','avea','foarte','care','sau'],
    chars: 'ăâîșțşţ',
    ngrams: ['și','în','de','re','te','ul','ea','are','ere','ire','ție','mente','pre','ne']
  },
  hu: {
    stop: ['a','az','és','van','nem','egy','én','te','ő','mi','ti','ők','hogy','mint','de','vagy','már','még','ház','kutya','lenni','nagyon','aki','pedig','is'],
    chars: 'áéíóöőúüű',
    ngrams: ['sz','gy','ny','cs','ly','zs','és','az','en','an','et','ot','ban','ben','nak','nek']
  },
  tr: {
    stop: ['ve','bir','bu','da','de','için','ile','çok','ben','sen','o','biz','siz','onlar','değil','var','yok','ev','köpek','olmak','ama','gibi','daha','ne','nasıl'],
    chars: 'çğıöşü',
    ngrams: ['ar','er','in','en','an','bir','lar','ler','yor','mak','mek','dır','dir','ve']
  },
  vi: {
    stop: ['và','của','là','có','không','một','tôi','bạn','anh','chị','em','chúng','họ','này','đó','cho','với','nhà','chó','được','rất','nhưng','hoặc','người'],
    chars: 'ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ',
    ngrams: ['ng','th','ch','nh','ph','tr','qu','và','của','không','được','những']
  },
  id: {
    stop: ['dan','yang','di','ke','dari','ini','itu','saya','kamu','dia','kami','kita','mereka','tidak','dengan','untuk','ada','rumah','anjing','adalah','sangat','tapi','atau','apa'],
    chars: '',
    ngrams: ['ng','an','en','kan','dan','yang','di','ke','ber','ter','me','pe','nya']
  }
} satisfies Partial<Record<LanguageCode, LatinProfile>>;
