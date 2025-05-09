export const locations = {
  kazakhstan: [
    'almaty',
    'astana',
    'shymkent',
    'karaganda',
    'aktobe',
    'taraz',
    'pavlodar',
    'uskemen',
    'semey',
    'kostanay',
    'kyzylorda',
    'uralsk',
    'aktau',
    'atyrau',
    'petropavl',
    'taldykorgan',
    'kokshetau',
    'temirtau',
    'turkistan'
  ],
  russia: [
    'moscow',
    'saint_petersburg',
    'novosibirsk',
    'yekaterinburg',
    'kazan',
    'nizhny_novgorod',
    'chelyabinsk',
    'krasnoyarsk',
    'samara',
    'ufa',
    'rostov_on_don',
    'omsk',
    'krasnodar',
    'voronezh',
    'volgograd',
    'perm'
  ],
  usa: [
    'new_york',
    'los_angeles',
    'chicago',
    'houston',
    'phoenix',
    'philadelphia',
    'san_antonio',
    'san_diego',
    'dallas',
    'san_jose',
    'austin',
    'jacksonville',
    'san_francisco',
    'columbus',
    'fort_worth',
    'indianapolis'
  ],
  uk: [
    'london',
    'manchester',
    'birmingham',
    'leeds',
    'glasgow',
    'liverpool',
    'newcastle',
    'nottingham',
    'sheffield',
    'bristol',
    'belfast',
    'leicester',
    'edinburgh',
    'cardiff',
    'coventry',
    'brighton'
  ],
  germany: [
    'berlin',
    'hamburg',
    'munich',
    'cologne',
    'frankfurt',
    'stuttgart',
    'dusseldorf',
    'dortmund',
    'essen',
    'leipzig',
    'bremen',
    'dresden',
    'hanover',
    'nuremberg',
    'duisburg',
    'bochum'
  ],
  france: [
    'paris',
    'marseille',
    'lyon',
    'toulouse',
    'nice',
    'nantes',
    'strasbourg',
    'montpellier',
    'bordeaux',
    'lille',
    'rennes',
    'reims',
    'saint_etienne',
    'toulon',
    'grenoble',
    'dijon'
  ],
  china: [
    'beijing',
    'shanghai',
    'guangzhou',
    'shenzhen',
    'chengdu',
    'tianjin',
    'wuhan',
    'xian',
    'hangzhou',
    'nanjing',
    'chongqing',
    'shenyang',
    'qingdao',
    'zhengzhou',
    'jinan',
    'changsha'
  ],
  japan: [
    'tokyo',
    'yokohama',
    'osaka',
    'nagoya',
    'sapporo',
    'fukuoka',
    'kobe',
    'kyoto',
    'kawasaki',
    'saitama',
    'hiroshima',
    'sendai',
    'chiba',
    'kitakyushu',
    'sakai',
    'niigata'
  ],
  canada: [
    'toronto',
    'montreal',
    'vancouver',
    'calgary',
    'edmonton',
    'ottawa',
    'winnipeg',
    'quebec_city',
    'hamilton',
    'kitchener',
    'london',
    'victoria',
    'halifax',
    'oshawa',
    'windsor',
    'saskatoon'
  ],
  australia: [
    'sydney',
    'melbourne',
    'brisbane',
    'perth',
    'adelaide',
    'gold_coast',
    'newcastle',
    'canberra',
    'wollongong',
    'hobart',
    'geelong',
    'townsville',
    'cairns',
    'darwin',
    'launceston',
    'bendigo'
  ]
} as const;

export type Country = keyof typeof locations;
export type City = typeof locations[Country][number];
