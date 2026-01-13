import { useState  , useEffect } from 'react'; // useEffect 可以監視 State 改變的樣態
import axios from "axios";
import Swal from 'sweetalert2'; // 錯誤訊息吐司

// App.jsx
import "./assets/style.css";

// ==== API 設定 ====
const API_BASE = import.meta.env.VITE_API_BASE; // (從不上傳的 env 讀取)
const API_PATH = import.meta.env.VITE_API_PATH;

const loginUrl = `${API_BASE}/admin/signin`; // 登入，post
const checkLoginUrl = `${API_BASE}/api/user/check`; // 確認是否登入，post
const getProductsUrl = `${API_BASE}/api/${API_PATH}/admin/products/all`;  // 取得產品列表(管理者)
const postProductsUrl = `${API_BASE}/api/${API_PATH}/admin/product`;// 新增產品資料
// 更新產品、刪除： 因為需要 id ，故寫再函室內




// vv ===== 狀態邏輯區 ==== vv
// 符號說明： ⚙️ 狀態管理、 🅕 函式、 ✡️ 打 api、 🔍 狀態檢查、⭐ 重要 

function App() {

  // ⚙️ 1. 表單資訊初始化
  const [formData, setFormData ] = useState({
    username: "", // 此處參數需跟 api 完全相同
    password: ""
  });

  // ⚙️ 2. 是否為登入狀態
  const [isAuth, setIsAuth] = useState(false); // 預設未登入

  // 🅕 2-1.執行 登出
  const handleLogout = () => {
    // 清除 cookie
    document.cookie = 'hextToken=;expires=;'

    // 清除 axios 預設 header
    delete axios.defaults.headers.common['Authorization'];

    // 狀態改為未登入，會切換回登入畫面
    setIsAuth(false);

    // 重置葉面狀態
    setPageState('admin');

    Toast.fire({
              icon: "success",
              title: '已登出',
              position: 'bottom-end', // 'bottom-right', 'bottom-left', (預設) 'top-end', 'top-left' 
              showConfirmButton: false, // 不需要確認按鈕
              timer: 2000 // 3秒後自動消失
          });


  };

  // 🔍 2-2. 應用程式初始化的時候，檢查 Cookie 是否有 Token
  useEffect(() => {
    setIsForbiddenOperate(true)
    const token = document.cookie.replace(
      // 1. 嘗試從 Cookie 中取得 Token (使用 Regex 抓取 hexToken)
      /(?:(?:^|.*;\s*)hexToken\s*\=\s*([^;]*).*$)|^.*$/,
        "$1",
    );

      // 如果 Token 存在，代表使用者之前登入過
      if (token){
        // 把 token 設定回 axios 的預設 header， 這樣 getProduct 才能執行
        axios.defaults.headers.common['Authorization'] = token;

        // 將登入狀態域設為已登入
        setIsAuth(true);

        // 檢查 token 是否仍有效無過期
        axios.post(checkLoginUrl)
          .then((res) => {
            // 有回應表示有效，順便重新讀取產品列表
            getProducts();
            setIsForbiddenOperate(false)
          })
          .catch((err) => {
            setIsForbiddenOperate(false)
            // 如果 token 過期就踢回首頁
            setIsAuth(false)
            
          })
      }
   },[]); // 空陣列代表只在「元件掛載完成」時執行一次


  // 🅕 3. 取得使用者輸入值(處理多個  input 欄位，有name屬性的)
      // # 資料流：使用者輸入 A > 偵測到 INPUT 改變，觸發 onChange 事件 > 呼叫此函數
      // ##      >  e.target 解構並提取輸入值 > 下達更新指令 setFormData
      // ###     > React 運算與重新渲染，走到 return 的 JSX 區域，將更新後的資料繪製到瀏覽器
  const handleInputChange = (e) => {
    const {name, value} = e.target;

    // 更新指令 Update Request
    setFormData((preData) => ({ // 括弧內是尚未更改的值(react 猿聲寫法)
      ...preData,
      [name]:value

    })) // 用函式取值
  };
  
  // 🅕✡️ 4. 按下送出後，觸發登入 API，同時觸發取得產品 api
      // ## 成功的話，會觸發 setIsAuth 將登入狀態改為 true
  const onSubmit = async (e) => {
    try {
      e.preventDefault(); // 阻止預設是建
      const response = await axios.post(loginUrl, formData)
      // console.log('登入成功')
      // console.log(response.data)

      // 從 response 中解構取得 api 回傳的 token 和到期日
      const { expired, token} = response.data;

      // 設定 Cookie，名稱可自訂 (Application >> Cookie 會多一列 hexToken)
      document.cookie = `hexToken=${token};expires=${new Date(expired)};`;

      // 修改實體建立時所指派的預設配置
      // 登入成功的話，會自動記錄在 axios header 裡面 
      axios.defaults.headers.common['Authorization'] = token;
      
      // 【是否為登入狀態】要設置為 true
      setIsAuth(true)

      // 初始頁面預設為管理後台
      setPageState('admin');

      // 觸發取得產品 api，才能讓一進入產品列表初始值就帶入 api 返還結果
      getProducts()

      Toast.fire({
              icon: "success",
              title: '登入成功',
              position: 'bottom-end', // 'bottom-right', 'bottom-left', (預設) 'top-end', 'top-left' 
              showConfirmButton: false, // 不需要確認按鈕
              timer: 2000 // 3秒後自動消失
          });


    } catch (error) {
      // 【是否為登入狀態】登入失敗要設置為 false
      setIsAuth(false)

      showErrorMsg(error, "登入失敗")
    }
  };

  // 🅕✡️ 5. 執行【是否已登入】驗證 ( 搭配轉圈圈)
  const checkLogin = async (e) => {

    // 使用者一點擊後，馬上啟動 setIsCheckLoading (會跳驗證中的轉圈圈)
    setIsCheckLoading(true);

    try {
      const response = await axios.post(checkLoginUrl)

      // 停止轉圈圈
      setIsCheckLoading(false);

      // console.log(response.data)
      if (response.data.success){
        const isConfirmed = await showConfirmWindows(
                '目前登入狀態：已登入',
                '',
                '確認', // 點此才會讓isConfirmed成立
                'success'
            );

            // 使用者確認後才執行api，退出則啥也沒發生
            if (isConfirmed){
                return;
            }
      } 
    } catch (error) {
      showErrorMsg(error, "驗證失敗")
      // 停止轉圈圈
      setIsCheckLoading(false);
    } 
  };

  // ⚙️ 5-1.紀錄【是否已登入】按鈕的讀取中狀態，初始預設為否(沒在驗證中)
  const [isCheckLoading, setIsCheckLoading] = useState(false)

  // ⚙️ 6. 產品資料狀態
  const [products, setProducts] = useState([]); // 產品列表返還是陣列，會去接 getProducts 的產物

  // ⚙️ 7. 使用者選擇的產品詳細資訊
  const [tempProduct, setTempProduct] = useState(); // 一開始預設沒有選到產品

  // 🅕 7-1. 清空狀態 (讓產品詳細資訊彈跳視窗消失)
  const closeModal = () => {
    setTempProduct(null)
  }

  // 🅕✡️ 8. 取得產品列表(管理者 all) ⭐⭐
  const getProducts = async () => {
    //setIsProductLoading(true)
    setIsForbiddenOperate(true)
    try {
      const response = await axios.get(getProductsUrl);

      // 定義新資料以免覆蓋 
        // 此時的產品是物件(客戶端才是陣列)
      let originalProducts = response.data.products

      // 使用 Object.values() 把物件的值取出來變成陣列
      // 加上 || {} 是為了防止 API 回傳 null 時報錯
      originalProducts = Object.values(originalProducts || {})

      // 將資料依照類別排序 
      const sortedProduct = sortProduct(originalProducts)
      
      // 丟回去給 setProducts
      setProducts(sortedProduct)
      //setIsProductLoading(false)
      setIsForbiddenOperate(false)

    } catch (error) {
      // setIsProductLoading(false)
      setIsForbiddenOperate(false)
      showErrorMsg(error, "取得產品失敗")
    }
  };

  // 🅕 8-1 排序產品資料(依照類別)
  const sortProduct = (products) => {
    const categoryOrder = ['肉類', '蔬菜類', '水果類'];

    // 使用 [...products] 建立一個新陣列再排序，是 React 的好習慣 (避免修改到原始參考)
    const newSortedArray = [...products].sort((a, b) => {
      // 找出兩個物件在排序表中的索引
      const indexA = categoryOrder.indexOf(a.category);
      const indexB = categoryOrder.indexOf(b.category);

      // 如果找不到類別 (indexOf 回傳 -1)，把它排到最後面
      // (這行是防止如果有沒定義到的類別，不會跑到最前面)
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      // 比較索引值
      return indexA - indexB; // 簡寫：小減大 (升冪排序)
    })

    return newSortedArray;
  };

  // ⚙️ 8-2 載入產品中的轉圈圈
  const [isProductLoading,  setIsProductLoading] = useState(false)


  // 📄 21. 產品骨架 (包含產品 api 所需要的欄位)
  const defaultModalState = {
    imageUrl: "",
    title: "",
    category: "",
    unit: "",
    origin_price: "",
    price: "",
    description: "",
    content: "",
    is_enabled: 1, // 預設勾選
    imagesUrl: [""]
  };

  // 🅕 22.控制 【新增/編輯】 Modal 的函式
  const openProductModal = (modalType, product) => {
    setModalType(modalType) // modal場景設為新增或刪除

     // 設定資料 (要用...淺拷貝來複製物件的話要加上{}，複製陣列才不用加)
    setTempModalData({...product})

    setProductModalOpen(true) // 打開第二個 modal

  };

  // ⚙️ 22-1. 是否開啟【新增/編輯】 Modal
  const [isProductModalOpen , setProductModalOpen] = useState(false);

  // ⚙️ 23.紀錄現在是編輯還是新增模式
  const [modalType, setModalType] = useState('');

  // ⚙️ 24.【新增/編輯】專用資料容器(準備要送給 api 的)
      // 會在 25.取得使用者在表單填寫的內容 階段同步更新
  const [tempModalData, setTempModalData] = useState('');

  // 🅕 25.取得使用者在表單填寫的內容
  const handleModalInputChange =  (e) => {
    const {name, value, type, checked} = e.target

    // 根據 input type 轉換要傳入陣列的內容
    let finalValue;
    if (type === 'checkbox'){
      finalValue = checked ? 1 : 0
    } else if (type === 'number') {
      finalValue = Number(value)
    } else {
      finalValue = value
    }

    // 更新指令 Update Request
    setTempModalData((preData) => ({ // 括弧內是尚未更改的值(react 猿聲寫法)
      ...preData,
      [name]:finalValue

    })) // 用函式取值
  };

  // 🅕 25-1.處理圖片陣列
  const handleImageChange = (e, index) => {
    const {value } = e.target

    // 複製一份新圖片陣列 (會開啟新的記憶體0001)
    const newImages = [...tempModalData.imagesUrl]

    // 更新指定索引的值 (指向同一個0001，只修改內容，並沒有重新賦值)
    newImages[index] = value;

    // 覆蓋圖片陣列回到最終資料包
    setTempModalData((preData) => ({
      ...preData,
      imagesUrl : newImages

    }));
  }

  // 🅕✡️ 26. 點擊送出後依【新增/編輯】狀態串接 api 並傳送資料容器
      // !! 因為 tempModalData 市集時更新，所以不需要傳入也可以全域取用
  const onSubmitProduct = async (e) => {
    // 阻止預設事件
    e.preventDefault();
    
    // 開始轉圈圈
    setIsForbiddenOperate(true)
    // 組成資料
      
    try {
      // 要先宣告 reponse 才會全域被 if statement 外讀取
      let response;

      // 根據狀態決定要觸發的 api
      if (modalType === 'create'){
        //把 tempModalData 用【新增資料 api】 post打出去
        response =  await axios.post(postProductsUrl, {"data" : tempModalData})
      } else if (modalType === 'edit') {
        //把tempModalData用【更新資料 api】 put打出去
        const putProductsUrl = `${API_BASE}/api/${API_PATH}/admin/product/${tempModalData.id}`; 
        response =  await axios.put(putProductsUrl, {"data" : tempModalData})
      }
      
      if (response && response.data.success){
        // 關閉轉圈圈
        setIsForbiddenOperate(false)

        // 2. 關閉彈跳視窗
        setProductModalOpen(false)

        // 3. 觸發取得產品列表 api 並更新表單
        await getProducts();

        // 4. 顯示產品新增成功吐司
        Toast.fire({
                  icon: "success",
                  title: `${modalType === 'create' ? "產品新增成功": "產品更新成功"}`,
                  position: 'top-end', // 'bottom-right', 'bottom-left', (預設) 'top-end', 'top-left' 
                  showConfirmButton: false, // 不需要確認按鈕
                  timer: 3000 // 3秒後自動消失
              });
      }
      
    } catch (error) {
      setIsForbiddenOperate(false)
      showErrorMsg(error, `${modalType === 'create' ? "產品新增失敗": "產品更新失敗"}`)
      throw error;
    }
      

  };

  // 🅕 27.確認是否要刪除產品
  const confirmDelete = (product) => {
    // 把準備刪除的資料存進全域資料
    setTempDeleteProduct(product);

    // 打開確認視窗
    setIsNeedConfirm(true);


  };

  // 🅕✡️ 27-1.執行刪除產品
  const delProduct = async (productId) => {
    setIsForbiddenOperate(true)
    const delProductUrl = `${API_BASE}/api/${API_PATH}/admin/product/${productId}`
    try {

      const response = await axios.delete(delProductUrl);
      if (response.data.success){
        setIsForbiddenOperate(false)
        Toast.fire({
                  icon: "success",
                  title: "產品刪除成功",
                  position: 'top-end', // 'bottom-right', 'bottom-left', (預設) 'top-end', 'top-left' 
                  showConfirmButton: false, // 不需要確認按鈕
                  timer: 3000 // 3秒後自動消失
              });

        // 更新產品
        await getProducts();

      }
      
    } catch (error) {
      setIsForbiddenOperate(false)
      showErrorMsg(error, "刪除產品失敗")
      throw error;
    }

  };


  // ⚙️ 27-2.是否確認操作狀態中 (避免誤觸)
  const [isNeedConfirm , setIsNeedConfirm ] = useState(true);

  // 📄 27-3 刪除資料暫存區 (用以全域傳遞參數)
  const [tempDeleteProduct, setTempDeleteProduct] = useState(null)

  // ⚙️ 95. 是否跳出黑色全屏 (阻止使用者點擊)
  const [isForbiddenOperate, setIsForbiddenOperate] = useState(false);

  // 🅕 96 錯誤訊息吐司參數
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 4000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.onmouseenter = Swal.stopTimer;
      toast.onmouseleave = Swal.resumeTimer;
    }
  });

  // 🅕 97.捕捉錯誤訊息統一邏輯
  const showErrorMsg = (error , titleMsg) => {
      let errorMessage = '發生未預期的錯誤';

      // 檢查是否有伺服器回傳的錯誤響應
      if (error.response) {
      // 伺服器有回傳的話，嘗試取出 error.response.data.message
      errorMessage = error.response.data.message || `API 錯誤 (狀態碼: ${error.response.status})`;
      } else if (error.request) {
      // 請求已發出但沒有收到回應 (例如：網路中斷)
      errorMessage = '網路錯誤或伺服器無回應';
      } else {
      // 發生了在設定請求時觸發的錯誤
      errorMessage = error.message;
      }
    
      Toast.fire({
              icon: "error",
              title: titleMsg,
              text: errorMessage
          });
      throw error;
  }
  
  // 🅕 98.確認視窗
  const showConfirmWindows = async (title, text, confirmText = "確認", icon = "info") => {
    // 因為Swal.fire()是非同步，因此必須使用async

    const confirmWindow = await Swal.fire({
        title: title, // 確認視窗標題
        text: text, // 確認視窗文字
        icon: icon,
        showCancelButton: false,
        confirmButtonColor: "green",
        // cancelButtonColor: "gray",
        confirmButtonText: confirmText,
        // cancelButtonText: "取消",

        // // 自定義的屬性
        // customClass: {
        //     // 為確認按鈕附加一個自訂的 CSS 類別
        //     confirmButton: 'custom-confirm-button'
        // }
    });
    return confirmWindow.isConfirmed;
  };

     
  // ⚙️ 99.切換前台/後台頁面元件控制
  const [pageState, setPageState] = useState('admin'); // 預設登入後進到後台


  // 🔍 -- 確認狀態是否改變 (登入狀態)
  // useEffect(() => {
  //   console.log(`偵測到 isAuth 變動，最新的值是: ${isAuth}`);
  // }, [isAuth]); // 陣列裡放想監聽的變數
  
  // 🔍-- r檢視更新中的資料物件(每打一個字就會觸發)
  // useEffect(() => {
  //   // 只有當 tempModalData 真的更新完成後，這裡才會觸發
  //   console.log('資料已更新，最新的 tempModalData:', tempModalData);
  // }, [tempModalData]);
 

  // ^^ ===== 狀態管理定義結束 ==== ^^

  // vv ==== 建立 html 渲染、綁定元素 ==== vv

  return (
    <>
      {!isAuth ? (
        //  =================================
        //【未登入】 (也就是 (!isAuth) = True )
        //  =================================

        <div className='container nonLogin'>
          <div className="login-card">
            <h1 className='text-white mb-5 text-center'>🍗 吃飽了嗎 🥗</h1>
            
            <form
              className="form-floating  text-center"
              onSubmit={(e) => onSubmit(e)} // 觸發登入事件
            >
              <div className="form-floating  mb-3 ">
                <input 
                  type="email" 
                  value={formData.username} 
                  className="form-control " 
                  name="username" 
                  id="username" 
                  placeholder="name@example.com" 
                  onChange={(e) => handleInputChange(e)}
                  required
                />
                <label htmlFor="username">Email 信箱</label>
              </div>
              <div className="form-floating mb-4 ">
                <input 
                  type="password" 
                  value={formData.password} 
                  className="form-control" 
                  name="password" 
                  id="password" 
                  placeholder="Password" 
                  onChange={(e) => handleInputChange(e)}
                  required
                />
                <label htmlFor="password">密碼</label>
              </div>
              <h2 className='fs-6 text-light mb-3 text-center'>飯前請先登入</h2>
              <button 
                type='submit' 
                className='btn btn-warning mt-2 px-4 fw-bold align-self-center'
              >登入</button>
            </form>
          </div>
        </div>

        ) : ( /* 已登入的左括號 */

        //  =================================
        // 【已登入】 (包含 Header + 內容，也就是 (!isAuth) = False )
        //  =================================
        
        <div className='alreadyLoginPage'>

          {/* A. 共用header (前後台共用) */}
          <nav className="header">
            <div className="bg-secondary">
              <div className="container  d-flex justify-content-between align-items-center py-2">
                <div className="navbar-brand text-white fs-5 ">🍗 吃飽了嗎 🥗</div>

                <div className="navbar-nav d-flex flex-row gap-3 ">
                  <button 
                    className={`btn ${pageState === 'admin'? 'btn-outline-warning fw-bold text-decoration-underline' : 'btn-outline-light'}  admin-page`}
                    onClick={()=> setPageState('admin')}
                  >
                    管理後台
                  </button>

                  <button 
                    className={`btn ${pageState === 'front'? 'btn-outline-warning fw-bold  text-decoration-underline' : 'btn-outline-light'}  front-page`}
                    onClick={()=> setPageState('front')}
                  >
                    前台
                  </button>

                  <button 
                    className="btn btn-outline-light  login-page"
                    onClick={handleLogout}
                  >
                    登出
                  </button>
                </div>
              </div>
            </div>
          </nav>

          {/* B. 單頁式前後台頁面切換邏輯 */}

          {pageState === 'admin' ? (
            // ---------------------------
            // B-1. 後台管理頁面 (Admin Page)
            // ---------------------------

            <div className="admin-page container"> 

              {/*
              =================================
              01 底層：產品列表區
              ================================= 
              */}

              {/* 產品列表表格區 */} 
              <div className="row">
                <div className="col-12">
                  
               
                  <h2 className="mb-3 double-text fw-bold text-dark title-text mt-5 text-center">產品列表</h2>

                  
                  <div className='d-flex justify-content-between align-items-center mb-3 '>
                    
                    <div className='d-flex justify-content-start align-items-center gap-3 '>
                      {/* 驗證結果回傳前出現轉圈圈 spinner */}
                            
                      {/* 確認是否登入按鈕 */}
                      <button
                        className="btn btn-secondary px-2 px-md-3 mb-2 sub-title-text"
                        type="button"
                        onClick={checkLogin}
                      >
                        <span className='mobile-disable'>確認登入狀態 </span>
                        <span >ℹ️</span>
                      </button>

                      {/* 登入驗證中的轉圈圈符號 */}
                      {isCheckLoading && (
                        <div className="d-flex align-items-center me-3 text-white">
                          <div className="spinner-border spinner-border-sm me-2" role="status">
                            <span className="visually-hidden">
                              Loading...
                            </span>
                          </div>
                          <span className='fs-6'>驗證中，請稍後...</span>
                        </div>
                      )}    

                      {/* 產品載入中的轉圈圈符號 */}
                      {isProductLoading && (
                        <div className="d-flex align-items-center me-3 text-white  justify-content-center">
                              <div className="spinner-border spinner-border-sm me-2" role="status">
                                <span className="visually-hidden">
                                  Loading...
                                </span>
                              </div>
                              <span className='fs-6'>產品載入中，請稍後...</span>
                        </div>
                      )}
                    </div>

                    {/* 新增產品按鈕 */}
                    <button
                      className="btn btn-success  px-2 px-md-4 sub-title-text"
                      onClick={() =>
                        openProductModal('create', defaultModalState)
                      } /** 在這個產品點擊按鈕後會選擇此產品*/
                    >
                      <span className='mobile-disable'>新增產品 </span>
                      <span >✚</span>
                    </button>
                  </div>

                  {/* 表格開始 */}
                  <table className="table table-striped table-hover  ">
                    <thead className='table-success'>
                      <tr className='table-text'>
                        <th scope="col" className='align-middle'>產品名稱</th>
                        <th scope="col" className='align-middle'>類別</th>
                        <th scope="col" className='align-middle'>原價</th>
                        <th scope="col" className='align-middle'>售價</th>
                        <th scope="col" className='align-middle'>是否啟用</th>
                        <th scope="col" className='align-middle'>查看細節</th>
                        <th scope="col" className='align-middle'>編輯</th>
                        <th scope="col" className='align-middle'>刪除</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id} className='table-text'>
                          <td className='align-middle fw-bold text-center'>{product.title}</td>
                          <td className='align-middle text-center'>{product.category}</td>
                          <td className='align-middle text-center'>{product.origin_price} 元</td>
                          <td className='align-middle text-center'>{product.price} 元 / {product.unit}</td>
                          <td className={`align-middle text-center ${product.is_enabled ? 'text-success fw-bold' : 'text-danger'}`}>
                            {product.is_enabled ? "已啟用" : "未啟用"}
                          </td>
                          <td  className='align-middle text-center '>
                          {/* 查看詳細資訊按鈕 */}
                            <button
                              className="btn btn-primary "
                              onClick={() =>
                                setTempProduct(product)
                              } /** 在這個產品點擊按鈕後會選擇此產品*/
                            >
                              <span className='mobile-disable'>查看細節 </span>
                              <span >🔍</span>
                              
                            </button>
                          </td>
                          <td  className='align-middle text-center '>
                          {/* 編輯按鈕 */}
                            <button
                              className="btn btn-secondary"
                              onClick={() =>
                                openProductModal('edit', product)
                              } /** 在這個產品點擊按鈕後會選擇此產品*/
                            >
                              <span className='mobile-disable '>編輯 </span>
                              <span >♙</span>
                              
                            </button>
                          </td>
                          <td  className='align-middle text-center '>
                          {/* 刪除按鈕 */}
                            <button
                              className="btn btn-danger "
                              onClick={() =>
                                confirmDelete(product)
                              } /** 在這個產品點擊按鈕後會選擇此產品*/
                            >
                              <span className='mobile-disable'>刪除 </span>
                              <span > 🆇</span>
                              
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* 
              =================================
              02-1 彈跳視窗【檢視資料區塊】 (利用條件渲染) 
                  只有當 tempProduct 有值的時候，才顯示這個區塊
                  只有當 isProductModalOpen = false 的時候會出現 
              ================================= 
              */}

              {tempProduct && (
                // 灰色遮罩區
                <div 
                  className="modal-backdrop"
                  onClick = {closeModal}
                >
                  {/* 彈跳視窗區塊 */}
                  <div 
                    className="modal-content p-3 p-lg-5 "
                    onClick = {(e) => e.stopPropagation()} 
                  >
                    {/* 建立停止傳播，阻止事件向富元素傳遞(冒泡) */}
                    <h2 className='fw-bold text-dark double-text mb-3 title-text text-center'>產品詳細資訊</h2>
                    {tempProduct ? (
                      /** 有選到有 key id 的產品*/
                      <div className="card mb-3 ">
                        {/* 上半部區塊 */}
                        <div className="d-flex justify-content-start align-itmes-top  p-2 p-md-4 gap-3">
                          {/* 產品主圖 */}
                          <div className="half-item ">
                            <img
                              src={tempProduct.imageUrl}
                              className="card-img-top " 
                              alt={`${tempProduct.title}的主圖`}
                            />
                          </div>
                          {/* 產品名稱、類別 */}
                          <div className="d-flex  flex-column justify-content-start half-item">
                            <h5 className="card-title  fw-bold sub-title-text  ">
                              {tempProduct.title}
                              <span className="badge bg-primary ms-3  content-text">
                                {tempProduct.category}
                              </span>
                            </h5>
                            {/* 售價 */}
                            <div className="d-flex">
                              <p className="card-text  content-text">
                                <span className="content-text">售價：</span>
                                <del className='text-secondary content-text'>{tempProduct.origin_price} 元 </del>
                                <span className="content-text"> ↘️ 現在只要</span>
                                <span className=" text-primary fw-bold content-text">
                                  {"  "}
                                  {tempProduct.price} 元 / {tempProduct.unit}{" "}
                                </span>
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="card-body " >
                          {/* 中間-產品細節區塊 */}
                          <p className="card-text  content-text">📌 產品描述</p>
                          <p  className="card-text  card-describe content-text">{tempProduct.description}</p>
                          <p className="card-text  content-text">🍳 產品內容</p>
                          <p  className="card-text   card-describe content-text">{tempProduct.content}</p>
                          
                          { /** 更多圖片區域 */}
                          <h5 className="mt-4 mb-4 fw-bold sub-title-text text-center">更多圖片</h5>
                          <div className="d-flex flex-wrap gap-3 gap-md-4 justify-content-center">
                            {tempProduct.imagesUrl
                            // 當 url 不為空字串的時候才可以進到下一關
                            .filter((url) => url)
                            // 只將圖片 URL 不為空的陣列拿去跑 MAP
                            .map((url, index) => (
                              <img
                                key={index}
                                className='images'
                                src={url}
                              />
                            ))}
                          </div> 

                          <button 
                            type='button'
                            className="btn btn-secondary mt-5  py-2 px-5 align-self-center "
                            onClick={closeModal}
                          >
                            關閉
                          </button>
                        </div>
                      </div>
                      
                  ) : (
                  /** 沒選到任何產品*/
                  <p className="text-secondary">請選擇一個產品查看</p>
                  )}   {/* 有沒有選到產品的右括號 */}
                  </div>  {/** modal-content 的閉合 */}
                </div>  /** modal-backdrop 的閉合 */
              )}

              {/*
              ================================= 
              02-2 彈跳視窗【編輯/新增區塊】 (利用條件渲染) 
                  只有當 isProductModalOpen = true 的時候會出現
              =================================
              */}

              {isProductModalOpen && 
                // 基本架構與檢視資料模式相同，編輯模式下不允許點擊此處關閉
                <div 
                  className="modal-backdrop"
                  //onClick={() => setProductModalOpen(false)}
                >
                  {/* 彈跳視窗區塊 */}
                  <div 
                    className="modal-content p-3 p-lg-5 "
                    onClick = {(e) => e.stopPropagation()} 
                  >
                  {/* 建立停止傳播，阻止事件向富元素傳遞(冒泡) */}
                    <h2 className="text-center">
                      {modalType === 'create' ? "新增產品" : "編輯產品"}
                    </h2>

                    {/* 【02-2-1 編輯模式】 */}
                    <form
                      className="edit-form form-floating"
                      onSubmit={(e) => onSubmitProduct(e)} // 觸發送出事件
                    >
                      <div className="mb-3  ">
                        <label htmlFor="title " className=' col-form-label text-left'>產品名稱</label>
                        <input 
                          type="text" 
                          value= {tempModalData.title}
                          className="form-control " 
                          name="title" 
                          id="title" 
                          placeholder="填寫產品名稱，例如：花椰菜" 
                          onChange={(e) => handleModalInputChange(e)}
                          required
                        />
    
                        
                      </div>

                      <div className="d-flex justify-content-between">
                        <div className=" col-md-5 mb-3 ">
      
                            <label htmlFor="category" className='text-left'>產品類別</label>
                            <input 
                              type="text" 
                              value={tempModalData.category} 
                              className="form-control" 
                              name="category" 
                              id="category" 
                              placeholder="蔬菜類、水果類、肉類" 
                              onChange={(e) => handleModalInputChange(e)}
                              required
                            />

                          
                        </div>

                        <div className=" col-md-5  mb-3 ">
                          <label htmlFor="unit">單位</label>
                          <input 
                            type="text" 
                            value={tempModalData.unit} 
                            className="form-control " 
                            name="unit" 
                            id="unit" 
                            placeholder="市場常見的計價單位" 
                            onChange={(e) => handleModalInputChange(e)}
                            required
                          />
                          
                        </div>
                      </div>

                      <div className=" d-flex justify-content-between">
                        <div className="  col-md-5 mb-3 ">
                          <label htmlFor="origin_price">原價</label>
                          <input 
                            type="number" 
                            value={tempModalData.origin_price} 
                            className="form-control " 
                            name="origin_price" 
                            id="origin_price" 
                            placeholder="整數價格" 
                            onChange={(e) => handleModalInputChange(e)}
                            required
                          />
                          
                        </div>

                        <div className=" col-md-5 mb-3 ">
                          <label htmlFor="price">特價</label>
                          <input 
                            type="number" 
                            value={tempModalData.price} 
                            className="form-control " 
                            name="price" 
                            id="price" 
                            placeholder="整數價格" 
                            onChange={(e) => handleModalInputChange(e)}
                            required
                          />
                          
                        </div>
                      </div>

                      <div className="  mb-4">
                        <label htmlFor="description">產品描述 (description)</label>
                        <textarea 
                          type="text" 
                          value={tempModalData.description} 
                          className="form-control " 
                          rows="3"
                          name="description" 
                          id="description" 
                          placeholder="填寫這個產品特性總述" 
                          onChange={(e) => handleModalInputChange(e)}
                          required
                        />
                        
                      </div>
                      
                      <div className=" mb-3 ">
                        <label htmlFor="content">產品內容 (content)</label>
                        <textarea 
                          type="text" 
                          value={tempModalData.content} 
                          className="form-control " 
                          rows="3"
                          name="content" 
                          id="content" 
                          placeholder="填寫產品補充資訊" 
                          onChange={(e) => handleModalInputChange(e)}
                          required
                        />
                        
                      </div>
                      
                      <div className=" mb-4">
                        <label htmlFor="mageUrl">主圖網址</label>
                        <textarea 
                          type="text" 
                          value={tempModalData.imageUrl || undefined} 
                          className="form-control mb-2 " 
                          name="imageUrl" 
                          id="imageUrl" 
                          placeholder="貼上合法圖片網址" 
                          onChange={(e) => handleModalInputChange(e)}
                        />
                        <img 
                        src={tempModalData.imageUrl || undefined}  
                        alt="主圖預覽" 
                        className={`images {${tempModalData.imageUrl   ? "" : "d-none"}`}  />
                        
                      </div>

                      {/* 圖片群組 */}
                      <div className="form-row d-flex flex-wrap justify-content-between">

                        <div className=" mb-3 col-5 ">
                          <label htmlFor="image1">副圖1</label>
                          <textarea
                            type="text" 
                            value={tempModalData.imagesUrl[0] || ""} //如果是 undefined 就給空字串，避免抱錯
                            className="form-control mb-2" 
                            name="image1" 
                            id="image1" 
                            placeholder="貼上合法圖片網址" 
                            onChange={(e) => handleImageChange(e, 0)}
                            
                          />
                          <img 
                          src={tempModalData.imagesUrl[0] || undefined}   
                          alt="副圖1預覽" 
                          className={`images ${tempModalData.imagesUrl[0] ? "" : "d-none"}`}  />
                          
                        </div>

                        <div className=" mb-3 col-5">
                          <label htmlFor="image2">副圖2</label>
                          <textarea
                            type="text" 
                            value={tempModalData.imagesUrl[1]  || ""}
                            className="form-control mb-2" 
                            name="image2" 
                            id="image2" 
                            placeholder="貼上合法圖片網址" 
                            onChange={(e) =>handleImageChange(e, 1)}
                            
                          />
                          <img
                          src={tempModalData.imagesUrl[1] || undefined}  
                          alt="副圖2預覽" 
                          className={`images ${tempModalData.imagesUrl[1] ? "" : "d-none"}`}  />
                          
                        </div>

                        <div className=" mb-3 col-5 ">
                          <label htmlFor="image3">副圖3</label>
                          <textarea
                            type="text" 
                            value={tempModalData.imagesUrl[2]  || ""}
                            className="form-control mb-2" 
                            name="image3" 
                            id="image3" 
                            placeholder="貼上合法圖片網址" 
                            onChange={(e) => handleImageChange(e, 2)}
                            
                          />
                          <img 
                          alt="副圖3預覽" 
                          src={tempModalData.imagesUrl[2] }  
                          alt="副圖3預覽" 
                          className={`images ${tempModalData.imagesUrl[2] ? "" : "d-none"}`} />
                          
                        </div>

                        <div className=" mb-3 col-5 ">
                          <label htmlFor="image4">副圖4</label>
                          <textarea
                            type="text" 
                            value={tempModalData.imagesUrl[3]  || ""}
                            className="form-control mb-2" 
                            name="image4" 
                            id="image4" 
                            placeholder="貼上合法圖片網址" 
                            onChange={(e) => handleImageChange(e, 3)}
                            
                          />
                          <img 
                          src={tempModalData.imagesUrl[3] || undefined}  
                          alt="副圖4預覽" 
                          className={`images ${tempModalData.imagesUrl[3] ? "" : "d-none"}`}  />
                          
                        </div>

                        <div className=" mb-3  col-5">
                          <label htmlFor="image5">副圖5</label>
                          <textarea
                            type="text" 
                            value={tempModalData.imagesUrl[4]  || ""}
                            className="form-control mb-2" 
                            name="image5" 
                            id="image5" 
                            placeholder="貼上合法圖片網址" 
                            onChange={(e) => handleImageChange(e, 4)}
                            
                          />
                          <img 
                          src={tempModalData.imagesUrl[4] || undefined}  
                          alt="副圖5預覽" 
                          className={`images ${tempModalData.imagesUrl[4] ? "" : "d-none"}`} />
                          
                        </div>
                      </div>
                      
                      <div className="form-check mb-4">
                        <input 
                          type="checkbox" 
                          checked={!!tempModalData.is_enabled}  
                          /*(兩個驚嘆號轉成布林值才能給api用，!! 就像魔術師，把 1 變 true，把 0 變 false)*/
                          className="form-check-input" 
                          name="is_enabled" 
                          id="is_enabled" 
                          placeholder="is_enabled" 
                          onChange={(e) => handleModalInputChange(e)}
                          
                        />
                        <label htmlFor="is_enabled">是否啟用</label>
                      </div>

                      <div className="modal-footer d-flex gap-5 justify-content-center ">
                        <button className="btn  btn-success px-md-4">確認送出</button>

                        <button 
                          className="btn btn-secondary px-md-4"
                          onClick={() => setProductModalOpen(false)}
                        >取消
                        </button>
                        
                      </div>
                    </form>
                  
                  </div> {/* 編修modal彈跳視窗閉合*/}
                </div>  /* 編修modal遮罩閉合 */
              }

            {/* 刪除、新增、編輯、reload 產品中的等待遮罩 */}
            {isForbiddenOperate && (
              <div className="modal-backdrop">
                <div className="d-flex align-items-center me-3 text-white">
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">
                      Loading...
                    </span>
                  </div>
                  <span className='fs-6'>產品更新中 ，請稍後...</span>
                </div>
              </div>
            )};

            {/* 刪除產品確認畫面 */}
            {isNeedConfirm &&  tempDeleteProduct &&(
              <div className="modal-backdrop" 
              onClick={() => setIsNeedConfirm(false)}>
                <div className="d-flex align-items-center me-3 text-white">
                  <div className="confirm-window">
                    <h4 className='text-center text-dark fw-bold py-3 mt-2'>Are you sure❓</h4>
                    <p className='text-center text-dark fw-bold'>請確認是否要刪除下列產品</p>
                    <p className='text-center  fw-bold py-1 text-primary'>{tempDeleteProduct.title}</p>

                     <div className="modal-footer d-flex gap-5 justify-content-center">
                        <button 
                          className="btn  btn-danger px-md-4"
                          onClick={() => delProduct(tempDeleteProduct.id)}
                        >確認刪除
                        </button>

                        <button 
                          className="btn btn-secondary px-md-4"
                          onClick={() => setIsNeedConfirm(false)}
                        >取消
                        </button>
                      </div>
                        
                  </div>
                </div>
              </div>
            )};

            
              

            </div>  
            // ^^ 後台區塊結束 ^^
            
          ) : (
        
            // ---------------------------
            // B-2. 前台頁面 (Front Page)
            // ---------------------------
            <div className="front-page">
              <p className='p-4 text-white text-center fs-3'> 🧂 開發中~ 🍞</p>
            </div>

          )} {/* ^^ 前台區塊結束 ^^ */}
          {/* 前後台驗證邏輯結束 */}
        </div> 
        // ^^ 已登入區塊結束，，包含header的前後台共用大區塊

        ) //已登入的右括號
      }   
      {/* 驗證是否登入區塊結束 */}
    </>
  ); //return 的右括號
}

export default App
