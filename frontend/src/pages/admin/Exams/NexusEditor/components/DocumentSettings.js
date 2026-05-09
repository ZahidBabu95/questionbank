export const SUBJECTS = ["বাংলা","ইংরেজি","গণিত","বিজ্ঞান","পদার্থবিজ্ঞান","রসায়ন","জীববিজ্ঞান","ICT","ইতিহাস","ভূগোল","হিসাববিজ্ঞান","অর্থনীতি","পৌরনীতি"];
export const CLASSES  = ["তৃতীয়","চতুর্থ","পঞ্চম","ষষ্ঠ","সপ্তম","অষ্টম","নবম","দশম","একাদশ","দ্বাদশ"];
export const EXAMS    = ["প্রথম সাময়িক","দ্বিতীয় সাময়িক","অর্ধবার্ষিক","বার্ষিক পরীক্ষা","নির্বাচনী পরীক্ষা","মডেল টেস্ট","পূর্ব-নির্বাচনী","টেস্ট পেপার"];
export const GROUPS   = ["বিজ্ঞান","মানবিক","বাণিজ্য","সাধারণ"];
export const BOARDS   = ["ঢাকা","চট্টগ্রাম","রাজশাহী","কুমিল্লা","যশোর","বরিশাল","সিলেট","দিনাজপুর","ময়মনসিংহ"];
export const BN_FONTS = ["Noto Serif Bengali","Hind Siliguri","Tiro Bangla","Baloo Da 2"];
export const EN_FONTS = ["Times New Roman","Georgia","Arial","Helvetica","Courier New"];
export const PAGE_SIZES = {
  A4:{w:210,h:297,label:"A4 (210×297 মিমি)"},A3:{w:297,h:420,label:"A3 (297×420 মিমি)"},
  A5:{w:148,h:210,label:"A5 (148×210 মিমি)"},Legal:{w:216,h:356,label:"Legal (216×356 মিমি)"},
  Letter:{w:216,h:279,label:"Letter (216×279 মিমি)"},Custom:{w:210,h:297,label:"কাস্টম"},
};
export const HEADER_STYLES  = ["সাধারণ","ডাবল বর্ডার","বক্স স্টাইল","থিক টপ লাইন"];
export const SECTION_STYLES = ["কালো ব্যাকগ্রাউন্ড","বর্ডার বক্স","আন্ডারলাইন","ডটেড লাইন"];
export const WATERMARK_OPT  = ["কোনোটি নয়","DRAFT","MODEL TEST","CONFIDENTIAL","কাস্টম"];

export const DEFAULT_SETTINGS = {
  institute:"",subject:"",className:"",
  group:"",board:"",exam:"",year:"",
  time:"60 মিনিট",totalMarks:25,showGroup:false,showBoard:false,
  showName:false,showRoll:false,showReg:false,candidateLayout:"stacked",
  setCode:"",showSetCode:false,subjectCode:"",showSubjectCode:false,
  pageSize:"A4",orientation:"portrait",customW:210,customH:297,columns:1,colGap:10,
  marginTop:10,marginBottom:10,marginLeft:10,marginRight:10,
  bnFont:"Noto Serif Bengali",enFont:"Times New Roman",
  headerFontSize:18,subHeaderFontSize:13,bodyFontSize:13,
  optionFontSize:12,cqStemFontSize:13,cqPartFontSize:13,
  boldInstitute:true,boldSubject:true,
  lineHeight:1.9,headerLineHeight:1.2,questionGap:14,optionLineGap:4,cqPartGap:7,cqBetweenGap:20,sectionGap:16,
  mcqEnabled:true,mcqTotal:30,mcqAnswer:25,mcqMarksEach:1,
  mcqInstruction:"সকল প্রশ্নের উত্তর দেওয়া বাধ্যতামূলক। সঠিক উত্তরের বৃত্তটি কালো বলপয়েন্ট কলম দিয়ে ভরাট করো।",mcqOptionCols:2,negativeMarking:false,negativeValue:0.25,
  cqEnabled:true,cqTotal:11,cqAnswer:7,cqMarksA:1,cqMarksB:2,cqMarksC:3,cqMarksD:4,
  cqInstruction:"যেকোনো ৭টি প্রশ্নের উত্তর দাও।",
  headerStyle:"ডাবল বর্ডার",sectionStyle:"কালো ব্যাকগ্রাউন্ড",
  outerBorder:false,outerBorderWidth:1,
  watermark:"কোনোটি নয়",watermarkCustom:"DRAFT",watermarkOpacity:10,
  showPageNumber:true,pageNumberPos:"center",showLogo:false,showDivider:true,dividerStyle:"double",
  sections: [
    {
      id: "sec-1",
      name: "ক-বিভাগ: বহুনির্বাচনী প্রশ্ন",
      isMCQ: true,
      colGap: "0",
      instBg: false,
      columns: 2,
      lineGap: "1.2",
      fontSize: "11",
      optionGap: "-4",
      conditions: "মান: ১x৩০=৩০",
      instDivider: false,
      marksConfig: "hide",
      questionGap: "0",
      columnBorder: true,
      condFontSize: 16,
      instFontSize: 14,
      instructions: "[সকল প্রশ্নের উত্তর দেওয়া বাধ্যতামূলক। সঠিক উত্তরের বৃত্তটি কালো বলপয়েন্ট কলম দিয়ে ভরাট করো।]",
      nameFontSize: 15,
      optionLayout: "col4",
      numberingStyle: "bn",
      optionDecoration: "dot",
      nameGap: 0,
      nameTopGap: -18
    },
    {
      id: "sec-2",
      name: "খ-বিভাগ: সৃজনশীল প্রশ্ন",
      instructions: "যেকোনো ৭টি প্রশ্নের উত্তর দাও।",
      conditions: "মান: ১০x৭=৭০",
      numberingStyle: "bn",
      marksConfig: "hide",
      optionLayout: "col1",
      isMCQ: false
    }
  ]
};
