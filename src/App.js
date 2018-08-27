import React, { Component } from 'react'
import _ from 'lodash';
// import Dropdown from 'react-dropdown'
// import 'react-dropdown/style.css' 
import SimpleStorageContract from '../build/contracts/SimpleStorage.json'
import OnlineMarketplaceContract from '../build/contracts/OnlineMarketplace.json'
import getWeb3 from './utils/getWeb3'

import './css/oswald.css'
import './css/open-sans.css'
import './css/pure-min.css'
import './App.css'
// import { timingSafeEqual } from 'crypto';


class App extends Component {
  constructor(props) {
    super(props)

    this.state = {
      storageValue: 0,
      web3: null,
      simpleStorageContract: null,
      onlineMarketplaceContract: null,
      account: "0x0000000000000000000000000000000000000000",
      role: 0,
      value:"0x0000000000000000000000000000000000000000",
      loginAccount: "0x0000000000000000000000000000000000000000",
      storeowner: "0x0000000000000000000000000000000000000000",
      shopper:"0x0000000000000000000000000000000000000000",
      storefront: "",
      storefronts: [],
      products:[],
      selectedProductSku:null,
      selectedStoreFrontId: null,
      selectedStoreFrontBalance: 0,
      showStoreFrontTable: false,
      showProductsTable: false,
      showPurchaseProduct: false

    }
    this.getStoreOwnersStoreFronts = this.getStoreOwnersStoreFronts.bind(this);
    this.getStoresProducts = this.getStoresProducts.bind(this);
    this.getStoreFronts = this.getStoreFronts.bind(this);
  }

  componentWillMount() {
    // Get network provider and web3 instance.
    // See utils/getWeb3 for more info.

    getWeb3
    .then(results => {
      this.setState({
        web3: results.web3
      })

      // Instantiate contract once web3 provided.
      this.instantiateContract()
    })
    .catch(() => {
      console.log('Error finding web3.')
    })
  }

  instantiateContract() {
    /*
     * SMART CONTRACT EXAMPLE
     *
     * Normally these functions would be called in the context of a
     * state management library, but for convenience I've placed them here.
     */

    const contract = require('truffle-contract');
    const simpleStorage = contract(SimpleStorageContract);
    const onlineMarketplace = contract(OnlineMarketplaceContract);
    simpleStorage.setProvider(this.state.web3.currentProvider);
    onlineMarketplace.setProvider(this.state.web3.currentProvider);

    // Declaring this for later so we can chain functions on SimpleStorage.
    var simpleStorageInstance
    var onlineMarketplaceInstance
    // Get accounts.
    this.state.web3.eth.getAccounts((error, accounts) => {

      simpleStorage.deployed()
      .then((instance) => {
        simpleStorageInstance = instance
        this.setState({simpleStorageContract: simpleStorageInstance});
        // Stores a given value, 5 by default.
        // return simpleStorageInstance.set(5, {from: accounts[0]})
        return simpleStorageInstance.get.call(accounts[0])
      })
      .then((result) => {
        // Update state with the result.
        
        this.setState({ 
          storageValue: result.c[0],
          simpleStorageContract: simpleStorageInstance,
          account: accounts[0],
          admin: accounts[0],
          storeowner: accounts[1],
          shopper: accounts[accounts.length - 1],
          storeowners: accounts.slice(1,5),
          shoppers: accounts.slice(5)
        })
        return onlineMarketplace.deployed();
      })
      .then((instance) => {
        onlineMarketplaceInstance = instance;
        const account = this.state.admin;
        this.setState({onlineMarketplaceContract: onlineMarketplaceInstance});
        return onlineMarketplaceInstance.addAdministrator(account, {from: account, gas: 9040000});
      })
      .then((result) => {
        console.log(result);
      })
    })
  }
  handleClick(event) {
    const simpleStorageContract = this.state.simpleStorageContract;
    const account = this.state.account;
  
    var value = 3;

    simpleStorageContract.set(value, {from:account})
    .then(result =>  {
      return simpleStorageContract.get.call()
    })
    .then(result=> {
      return this.setState({ storageValue: result.c[0] })
    })
  }
  handleLogin(event) {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    onlineMarketplaceContract.login.call({from:account})
    .then((role) => {
      console.log(role.toString())
      this.setState({ role: role.toNumber(), account: account });
      if (role.toNumber() === 2 ) {
        this.getStoreOwnersStoreFronts()
      } else if (role.toNumber() === 401) {
        this.getStoreFronts()
      }
    })
    
  }

  handleLogout(event) {
    this.setState({ role: 0, account: "0x0000000000000000000000000000000000000000"});
  }
  handleLoginChange(event) {
    this.setState({loginAccount:event.target.value})
  }
  handleStoreOwnerChange(event) {
    this.setState({storeowner:event.target.value})
  }
  handleAddApprovedStoreOwnerSubmit(event) {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const storeowner = this.state.storeowner;
    onlineMarketplaceContract.addStoreOwner(storeowner, {from:account, gas: 9040000})
    .then((tx) => {
      console.log(tx);
      this.setState({
        addStoreOwnerTxResult: tx.logs
      })
    })
  }
  handleStoreFrontChange(event)  {
    this.setState({storefront: event.target.value});
  }
  handleCreateStoreFront(event) {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const storefront = this.state.storefront;
    onlineMarketplaceContract.createStoreFront(storefront, {from: account, gas: 9040000})
    .then((tx) => {
      console.log(tx);
      this.setState({
        createStoreFrontTxResult: tx.logs
      })
      this.getStoreOwnersStoreFronts()
    })
  }
  getStoreOwnersStoreFronts() {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const event = onlineMarketplaceContract.allEvents({fromBlock:0, toBlock: 'latest'});
    event.get((err,events) => {
      if (!err) {
        let storefronts =  _.filter(events, (event) => {
          return _.isEqual(event.event, "CreateStoreFront") && _.isEqual(event.args._owner, account)
        })
        
        this.setState({
          storefronts:_.map(storefronts, (storefront) => { 
            return storefront.args
          })
        });
      }         
    })    
  }
  getStoreFronts() {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const event = onlineMarketplaceContract.allEvents({fromBlock:0, toBlock: 'latest'});
    event.get((err,events) => {
      if (!err) {
        let storefronts =  _.filter(events, (event) => {
          return _.isEqual(event.event, "CreateStoreFront")
        })
        
        this.setState({
          storefronts:_.map(storefronts, (storefront) => { 
            return storefront.args
          })
        });
      }         
    })    
  }
  handleWithdrawClick(param, event) {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const _storeFrontId = param;
    onlineMarketplaceContract.getStoreBalance.call(_storeFrontId, {from: account, gas: 9040000})
    .then((balance) => {
      this.setState({
        selectedStoreFrontId: _storeFrontId,
        selectedStoreFrontBalance: _.toInteger(balance.toNumber()),
        showAddProduct: false, 
        showWithdraw:true,
        showProductsTable: false, 
        showRemoveProduct: false,
        showChangeProductPrice: false 
      })
    })
    
    
  }
  handleGetProductsClick(param,event) {
    this.setState({
      selectedStoreFrontId: param,
      showAddProduct: false, 
      showWithdraw:false,
      showProductsTable: true, 
      showRemoveProduct: false,
      showChangeProductPrice: false 
    })
    this.getStoresProducts(param);
  }
  getStoresProducts(storeFrontId) {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const _storeFrontId = storeFrontId;
    onlineMarketplaceContract.getProductCountForAStore.call(_storeFrontId, {from: account, gas: 9040000})
    .then((count) => {
      let _count = count.toNumber();     
      let getSkus = [];
      for(let i = 0; i < count; i++) {
        getSkus.push(onlineMarketplaceContract.getProductIdStoredAtIndex(_storeFrontId, i, {from: account, gas: 9040000}))
      }
      return Promise.all(getSkus)
    })
    .then((_skus) => {
      let getProducts = [];
      _.forEach(_skus, (_sku) => {
        getProducts.push(onlineMarketplaceContract.getProduct(_storeFrontId, _sku, {from: account, gas: 9040000}))
      })
      return Promise.all(getProducts);
    })
    .then((_products) => {
      this.setState({
        products: _.map(_products,(_product) => {
          console.log(_product)
          return {
            _sku: _product[0].toNumber(),
            _name: _product[1],
            _price: _product[2].toNumber(),
            _qty: _product[3].toNumber(),
          }
        })
      })
    })
  }
  handleAddProductClick(param, event) {
    this.setState({
      selectedStoreFrontId: param,
      showAddProduct: true, 
      showWithdraw:false,
      showProductsTable: false, 
      showRemoveProduct: false,
      showChangeProductPrice: false 
    })
  }
  handleAddProductToStoreClick(event) {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const name = this.state.productName;
    const price = _.toInteger(this.state.productPrice);
    const qty = _.toInteger(this.state.productQty);
    const selectedStoreFrontId = this.state.selectedStoreFrontId;
    onlineMarketplaceContract.addProduct(selectedStoreFrontId, 
      name,
      price,
      qty,
      {from: account, gas: 9040000})
    .then((tx) => {
      console.log(tx);
      this.setState({
        addProductTxResult: tx.logs
      })      
    })
  }
  handleProductNameChange(event) {
    this.setState({
      productName: event.target.value
    })
  }
  handleProductPriceChange(event) {
    this.setState({
      productPrice: _.toSafeInteger(event.target.value)
    })
  }
  handleProductQtyChange(event) {
    this.setState({
      productQty: _.toSafeInteger(event.target.value)
    })
  }
  handleProductChangePriceClick(_sku, event) {
    this.setState({
      selectedProductSku: _sku,
      showAddProduct: false, 
      showWithdraw:false,
      showProductsTable: false, 
      showRemoveProduct: false,
      showChangeProductPrice: true 
    })
  }
  handleProductRemoveClick(_sku, event) {
    this.setState({
      selectedProductSku: _sku,
      showAddProduct: false, 
      showWithdraw:false,
      showProductsTable: false, 
      showRemoveProduct: true,
      showChangeProductPrice: false 
    })
  }
  handleProductPurchaseClick(_product, event) {
    this.setState({
      selectedProductSku: _product._sku,
      selectedProductPrice: _product._price,
      showAddProduct: false, 
      showWithdraw:false,
      showProductsTable: false, 
      showRemoveProduct: false,
      showChangeProductPrice: false,
      showPurchaseProduct: true
    })
  }
  handleChangeProductPriceClick() {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const _price = _.toInteger(this.state.productPrice);
    const _storeFrontId = this.state.selectedStoreFrontId;
    const _sku = this.state.selectedProductSku;
    onlineMarketplaceContract.changePrice( 
      _storeFrontId,
      _sku,
      _price,
      {from: account, gas: 9040000})
    .then((tx) => {
      console.log(tx);
      this.setState({
        changeProductPriceTxResult: tx.logs
      })      
      this.getStoresProducts(_storeFrontId)
    })
  }
  handleConfirmRemoveProductClick() {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const _storeFrontId = this.state.selectedStoreFrontId;
    const _sku = this.state.selectedProductSku;
    onlineMarketplaceContract.removeProduct( 
      _storeFrontId,
      _sku,
      {from: account, gas: 9040000})
    .then((tx) => {
      console.log(tx);
      this.setState({
        removeProductTxResult: tx.logs
      })      
      this.getStoresProducts(_storeFrontId)
    })
  }
  handleConfirmPurchaseClick() {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const _storeFrontId = this.state.selectedStoreFrontId;
    const _sku = this.state.selectedProductSku;
    const _qty = this.state.productQty;
    const _price = this.state.selectedProductPrice;
    const _totalPrice = _.toSafeInteger(_price) * _.toSafeInteger(_qty);
    const _value = this.state.web3.toWei(_totalPrice, 'ether');
    console.log(_totalPrice, _value)
    onlineMarketplaceContract.purchaseProduct( 
      _storeFrontId,
      _sku,
      _qty,
      {from: account, gas: 9040000, value: _value})
    .then((tx) => {
      console.log(tx);
      this.setState({
        purchaseProductTxResult: tx.logs
      })      
      this.getStoresProducts(_storeFrontId)
    })
  }
  handleConfirmWithdraw() {
    const onlineMarketplaceContract = this.state.onlineMarketplaceContract;
    const account = this.state.loginAccount;
    const _storeFrontId = this.state.selectedStoreFrontId;
    const _sku = this.state.selectedProductSku;
    onlineMarketplaceContract.withdraw( 
      _storeFrontId,
      _sku,
      {from: account, gas: 9040000})
    .then((tx) => {
      console.log(tx);
      this.setState({
        withdrawTxResult: tx.logs
      })
    })
  }
  render() {
    return (
      <div className="App">
        <nav className="navbar pure-menu pure-menu-horizontal">
            <a href="#" className="pure-menu-heading pure-menu-link">Online Marketplace</a>
        </nav>

        <main className="container">
          <div className="pure-g">
            <div className="pure-u-1-1">
              <h1>Online Marketplace</h1>
              {/* <p>Your Truffle Box is installed and ready.</p>
              <h2>Smart Contract Example</h2>
              <p>If your contracts compiled and migrated successfully, below will show a stored value of 5 (by default).</p>
              <p>Try changing the value stored on <strong>line 59</strong> of App.js.</p>
              <p>The stored value is: {this.state.storageValue}</p>
              <button onClick={this.handleClick.bind(this)}>Set Storage</button> */}
            </div>
            <div className="pure-u-1-1">  
              <p>Administrator Account: {this.state.admin}</p>
              <p>Storeowner Account: {this.state.storeowner}</p>
              <p>Shopper Account: {this.state.shopper}</p>
              {this.state.role == 0 ? 
                <div><input type="text" value={this.state.loginAccount} onChange={this.handleLoginChange.bind(this)} />
                <button onClick={this.handleLogin.bind(this)}>Login</button></div>
               : <div>Currently LoggedIn Account: {this.state.account}<button onClick={this.handleLogout.bind(this)}>Logout</button></div>}

            </div>
            {this.state.role === 1 ?
            <div className="pure-u-1-1">
              <p>Admin view</p>
              <AvaiableAccounts accounts={this.state.storeowners} />
              <input type="text" value={this.state.storeowner} onChange={this.handleStoreOwnerChange.bind(this)} />
              <button onClick={this.handleAddApprovedStoreOwnerSubmit.bind(this)}>Add Store Owner</button>
              
              <p>{this.state.addStoreOwnerTxResult ? "Success" : null}</p>
            </div>
            : null}
            {this.state.role === 2 ?
            <div className="pure-u-1-1">
              <p>Store Owner view</p>
              <div>
                <input type="text" value={this.state.storefront} onChange={this.handleStoreFrontChange.bind(this)} />
                <button onClick={this.handleCreateStoreFront.bind(this)}>Create Store Front</button>
                <p>{this.state.storefront}</p>
                <p>{this.state.createStoreFrontTxResult ? "Success" : null}</p>
              </div>
              <div>
                <table className="pure-table">
                    <tr>
                      <th>Store Front Id</th>
                      <th>Name</th>
                      <th>Store Front Owner</th>
                      <th>Get Balance</th>
                      <th>Get Products</th>
                      <th>Add Product</th>
                    </tr>
                  {
                    _.map(this.state.storefronts, (storefront, i)=>{
                      return (<tr key={i}>
                          <td>{storefront._storeFrontId}</td>
                          <td>{storefront._name}</td>
                          <td>{storefront._owner}</td>
                          <td><button onClick={this.handleWithdrawClick.bind(this, storefront._storeFrontId)}>Withdraw</button></td>
                          <td><button onClick={this.handleGetProductsClick.bind(this, storefront._storeFrontId)}>Get products</button></td>
                          <td><button onClick={this.handleAddProductClick.bind(this, storefront._storeFrontId)}>Add Product</button></td>
                      </tr>)
                    })
                  }
                </table>
              </div>
              {this.state.showAddProduct ? 
              <div>
                <p>Add product</p>
                <div>
                  <p> Store Front Id:<input type="text" value={this.state.selectedStoreFrontId} /></p>
                  <p> Product Name:<input type="text" value={this.state.productName} onChange={this.handleProductNameChange.bind(this)} /></p>
                  <p> Product Price:<input type="text" value={this.state.productPrice} onChange={this.handleProductPriceChange.bind(this)} /></p>
                  <p> Product Qty:<input type="text" value={this.state.productQty} onChange={this.handleProductQtyChange.bind(this)} /></p>
                  <button onClick={this.handleAddProductToStoreClick.bind(this)}>Add Product To Store</button>
                  <p>{this.state.addProductTxResult ? "Success" : null}</p>
                </div>
              </div>
              : null }
              {this.state.showProductsTable ?
              <div>
                <p>StoreFront products</p>
                <div>
                  <table className="pure-table">
                      <tr>
                        <th>Sku#</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th></th>
                        <th></th>
                        <th></th>
                      </tr>
                    {
                      _.map(this.state.products, (product, i)=>{
                        return (<tr key={i}>
                            <td>{product._sku}</td>
                            <td>{product._name}</td>
                            <td>{product._price}</td>
                            <td>{product._qty}</td>
                            <td><button onClick={this.handleProductChangePriceClick.bind(this, product._sku)}>Change Price</button></td>
                            <td><button onClick={this.handleProductRemoveClick.bind(this, product._sku)}>Remove</button></td>
                        </tr>)
                      })
                    }
                  </table>
                </div>
              </div>
              : null }
              {this.state.showRemoveProduct ? 
              <div>
                <p>Remove StoreFront products</p>
                <div>
                  <p> Store Front Id:<input type="text" value={this.state.selectedStoreFrontId} /></p>
                  <p> Product Sku:<input type="text" value={this.state.selectedProductSku} /></p>
                  <button onClick={this.handleConfirmRemoveProductClick.bind(this)}>Confirm Remove Product</button>
                  <p>{this.state.removeProductTxResult ? "Success" : null}</p>
                </div>
              </div>
              : null }
              {this.state.showChangeProductPrice ? 
              <div>
                <p>Change StoreFront product price</p>
                <div>
                  <p> Store Front Id:<input type="text" value={this.state.selectedStoreFrontId} /></p>
                  <p> Product Sku:<input type="text" value={this.state.selectedProductSku} /></p>
                  <p> Product Price:<input type="text" value={this.state.productPrice} onChange={this.handleProductPriceChange.bind(this)} /></p>
                  <button onClick={this.handleChangeProductPriceClick.bind(this)}>Change Product Price</button>
                  <p>{this.state.changeProductPriceTxResult ? "Success" : null}</p>
                </div>
              </div>              
              : null }
              {this.state.showWithdraw ? 
              <div>
                <p>With draw funds</p>
                <div>
                  <p> Store Front Id:<input type="text" value={this.state.selectedStoreFrontId} /></p>
                  <p> Store Front Balance:<input type="text" value={this.state.selectedStoreFrontBalance} /></p>                  
                  <button onClick={this.handleConfirmWithdraw.bind(this)}>Confirm Withdraw</button>
                  <p>{this.state.withdrawTxResult ? "Success" : null}</p>
                </div>
              </div>
              : null }
            </div>
            : null}
            {this.state.role === 401 ?
            <div className="pure-u-1-1">
              <p>Shopper view</p>
              {!this.state.showProductsTable ? 
              <div className="pure-u-1-1">
                <table className="pure-table">
                    <tr>
                      <th>Store Front Id</th>
                      <th>Name</th>
                      <th>Store Front Owner</th>
                      <th></th>
                    </tr>
                  {
                    _.map(this.state.storefronts, (storefront, i)=>{
                      return (<tr key={i}>
                          <td>{storefront._storeFrontId}</td>
                          <td>{storefront._name}</td>
                          <td>{storefront._owner}</td>                          
                          <td><button onClick={this.handleGetProductsClick.bind(this, storefront._storeFrontId)}>View Products</button></td>
                      </tr>)
                    })
                  }
                </table>
              </div>
              : null }
              {this.state.showProductsTable ? 
              <div>
                <p>StoreFront products</p>
                <div>
                  <table className="pure-table">
                      <tr>
                        <th>Sku#</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Qty</th>
                        <th></th>
                      </tr>
                    {
                      _.map(this.state.products, (product, i)=>{
                        return (<tr key={i}>
                            <td>{product._sku}</td>
                            <td>{product._name}</td>
                            <td>{product._price}</td>
                            <td>{product._qty}</td>
                            <td><button onClick={this.handleProductPurchaseClick.bind(this, product)}>Purchase</button></td>
                        </tr>)
                      })
                    }
                  </table>
                </div>
              </div>  
              : null}
              {this.state.showPurchaseProduct ? 
                <div>
                <p>Purchase Product</p>
                <div>
                  <p> Store Front Id:<input type="text" value={this.state.selectedStoreFrontId} /></p>
                  <p> Product Sku:<input type="text" value={this.state.selectedProductSku} /></p>
                  <p> Product Qty:<input type="text" value={this.state.productQty} onChange={this.handleProductQtyChange.bind(this)} /></p>
                  <button onClick={this.handleConfirmPurchaseClick.bind(this)}>Confirm Purhcase</button>
                  <p>{this.state.purchaseProductTxResult ? "Success" : null}</p>
                </div>
              </div> 
              : null}
            </div>
            : null}
          </div>
        </main>
      </div>
    );
  }
}

function AvaiableAccounts(accounts) {
  
  var subset = accounts.accounts
  return (<p>Available Accounts: {JSON.stringify(subset)}</p>);
}

function Login(state) {
  return (<div><input type="text" value={this.state.account} onChange={this.handleChange.bind(this)} />
  <button onClick={this.handleLogin.bind(this)}>Login</button></div>);
}
export default App
