import React, { Component } from 'react'
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
      shopper:"0x0000000000000000000000000000000000000000"
    }
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
    onlineMarketplaceContract.addStoreOwner(storeowner, {from:account})
    .then((tx) => {
      console.log(tx);
      // this.setState({
      //   txResult: tx.event.
      // })
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
              <p>Your Truffle Box is installed and ready.</p>
              <h2>Smart Contract Example</h2>
              <p>If your contracts compiled and migrated successfully, below will show a stored value of 5 (by default).</p>
              <p>Try changing the value stored on <strong>line 59</strong> of App.js.</p>
              <p>The stored value is: {this.state.storageValue}</p>
              <button onClick={this.handleClick.bind(this)}>Set Storage</button>
            </div>
            <div className="pure-u-1-1">  
              <p>Administrator Account: {this.state.admin}</p>
              {this.state.role == 0 ? 
                <div><input type="text" value={this.state.loginAccount} onChange={this.handleLoginChange.bind(this)} />
                <button onClick={this.handleLogin.bind(this)}>Login</button></div>
               : <button onClick={this.handleLogout.bind(this)}>Logout</button>}
            </div>
            {this.state.role === 1 ?
            <div className="pure-u-1-1">
              <p>Admin view</p>
              <AvaiableAccounts accounts={this.state.storeowners} />
              <input type="text" value={this.state.storeowner} onChange={this.handleStoreOwnerChange.bind(this)} />
              <button onClick={this.handleAddApprovedStoreOwnerSubmit.bind(this)}>Add Store Owner</button>
              <p>{this.state.value}</p>
            </div>
            : null}
            {this.state.role === 2 ?
            <div className="pure-u-1-1">
              <p>Store Owner view</p>
            </div>
            : null}
            {this.state.role === 401 ?
            <div className="pure-u-1-1">
              <p>Shopper view</p>
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
