pragma solidity ^0.4.24;

import "zeppelin/contracts/ownership/Ownable.sol";
import "zeppelin/contracts/lifecycle/Destructible.sol";
/** @title OnlineMarketplace. */
contract OnlineMarketplace is Ownable,Destructible {
    
    /**A struct type.
        Creates a product struct
     */

    struct Product {
        string name; // name of the product
        uint sku; // sku #
        uint price; // price
        uint qty; // quantity
        State state; // Current state
        address buyer;
        uint index; // pointer to the index in productIndex;
    }

    /**A struct type.
        Creates a Store front struct.
     */
    struct StoreFront {
        string name; // name of the store front
        address owner; // owner of the store
        uint balance; // funds collected in the store
        mapping(uint => Product) products; // products in the store
        uint[] productIndex; // array to track number of prducts
        uint index; //pointer to the index in storeFrontINdex
    }
    struct User
    {
        uint role;
        bool isActive;
    }

    /** An enum type.
     */
    enum State {
        ForSale, 
        Sold,
        Removed
    }

    /**Set the owner
     */
    address owner;
    
    /* Track the most recent sku # */
    uint skuCount;

    mapping(address => User) private users; // The administrator list.
    // mapping(address => bool) private approvedStoreOwners; // The store owner list.
    mapping(bytes32 => StoreFront) private storeFronts; //The storefronts.

    bytes32[] storeFrontIndex; // Array to track the store fronts.
    
    event AddAdministrator(address _administratorAddress);
    
    event AddStoreOwner(address _storeOwnerAddress);
    
    event CreateStoreFront(bytes32 _storeFrontId, string _name, address _owner);
    
    event ForSale(bytes32 _storeFrontId, string _productName, uint _sku, uint _qty);
    
    event ChangePrice(bytes32 _storeFrontId, uint _sku,uint _oldPrice, uint _newPrice);
    
    event Sold(bytes32 _storeFrontId, uint _sku, uint _qty, address _buyer);

    event Removed(bytes32 _storeFrontId, uint _sku);
    
    event Withdraw(bytes32 _storeFrontId, uint _balance);

    event LogSender(address _address);
    
    /* Checks if msg.sender is the owner of the contract */
    modifier isOwner() {
        require(owner == msg.sender);
        _;
    }
    
    /* Checks if msg.sender is an administrator */
    modifier verifyIsAdmin() {
        require(isAdmin(msg.sender));
        _;
    }
    
    /* Checks if msg.sender is an approved store owner */
    modifier verifyIsApprovedStoreOwner() {
        require(isApprovedStoreOwner(msg.sender));
        _;
    }
    
    /* Checks if msg.sender is the expected address value. */
    modifier verifyCaller (address _address) { 
        require (msg.sender == _address); 
        _;
    }
    
    modifier checkValue(bytes32 _storeFrontId, uint _sku) {
      //refund them after pay for item (why it is before, _ checks for logic before func)
        _;
        uint _price = storeFronts[_storeFrontId].products[_sku].price;
        uint amountToRefund = msg.value - _price;
        storeFronts[_storeFrontId].products[_sku].buyer.transfer(amountToRefund);
    }
    
    modifier forSale(bytes32 _storeFrontId, uint sku) {
        require(storeFronts[_storeFrontId].products[sku].state == State.ForSale);
        _;
    }
    
    modifier paidEnough(uint _price) { 
        require(msg.value >= _price); 
        _;
    }
    
    modifier qtyAvailable(bytes32 _storeFrontId, uint _sku, uint _qty) { 
        require(storeFronts[_storeFrontId].products[_sku].qty >= _qty); 
        _;
    }
    
    /**Constructor.
        @dev Instantiates the skuCount to 0.  Sets owner to msg.sender.
     */
    constructor() 
        public
    {
        owner = msg.sender;
        skuCount = 0;
    }
    
    function () 
        public
    {
        emit LogSender(msg.sender);
    }
    /** Checks if the passed address is an administrator
     * @param _address  THe address to check.
     * @return success
     */
    function isAdmin(address _address)
        public
        view
        returns (bool success)
    {
        return users[_address].isActive && users[_address].role == 1;
    }

     /**
       * @dev Adds the provided address as an administrator.
       * @param _address Address of the store owner.
       * @return success
     */
    function addAdministrator(address _address)
        public
        isOwner
        returns (bool success)
    {
        users[_address] = User({role:1,isActive:true});
        emit AddAdministrator(_address);
        return true;
    }
    
        
    /**
      * @dev Adds the provided address as an approved store owner.
      * @param _address address of the store owner.
      * @return success
     */
    function addStoreOwner(address _address)
        public
        verifyIsAdmin
        returns (bool success)
    {        
        users[_address] = User({role:2,isActive:true});
        emit AddStoreOwner(_address);
        return true;
    }
    
    /**Check if the passed address is an approved store owners
     * @param _address  The address to check.
     * @return success
     */
    function isApprovedStoreOwner(address _address)
        public
        view
        returns (bool success)
    {
        return users[_address].isActive && users[_address].role == 2;
    }

     
    /**Check if the passed address is a valid user
     * @return success
     */
    function login()
        public
        view
        returns (uint role)
    {
        if (users[msg.sender].role != 0) {
            return users[msg.sender].role;
        } else {
            return 401;
        }
    }
       
    /**Crate a store front
    * @param _name name of the store front
    * @return success
     */
    function createStoreFront(string _name)
        public
        verifyIsApprovedStoreOwner
        returns (bool success) 
    {
        bytes32 _storeFrontId = keccak256(abi.encodePacked(_name));
        storeFrontIndex.push(_storeFrontId);
        storeFronts[_storeFrontId].name = _name;
        storeFronts[_storeFrontId].owner = msg.sender;
        storeFronts[_storeFrontId].index = storeFrontIndex.length - 1;        
        emit CreateStoreFront(_storeFrontId, _name, msg.sender);
        return true;
    }
    
    /**
     * @dev Returns the number of store fronts
     * @return numberOfStoreFronts
     */ 
    function getStoreFrontCount()
        public
        view
        returns (uint numberOfStoreFronts)
    {
        return storeFrontIndex.length;
    }
    
    /**
     * @dev Returns the store front details.
     * @param _index The index 
     * @return storeFrontId The storeFrontId stored at this index.
    */
    function getStoreFrontIdByIndex(uint _index)
        public
        view
        returns (bytes32 storeFrontId)
    {
        return (storeFrontIndex[_index]);
    }
    
    /**
     * @dev Returns the store front details.
     * @param _storeFrontId The id of the store front
     * @return storeFrontName The name of the store front
     * @return storeOwner The address of the store owner
     */
    function getStoreFront(bytes32 _storeFrontId)
        public
        view
        returns (string storeFrontName, address storeOwner)
    {
        return (storeFronts[_storeFrontId].name, storeFronts[_storeFrontId].owner);
    }

    /**
     * @dev Returns the store front balance.
     * @param _storeFrontId The id of the store front
     * @return _balance
     */
    function getStoreBalance(bytes32 _storeFrontId)
        public
        view
        returns (uint _balance)
    {
        return storeFronts[_storeFrontId].balance;
    }

    /**
     * @dev Add product to the store
     * @param _storeFrontId The id of the store front     
     * @param _name The name of the product
     * @param _price The price of the product
     * @return success     
     */
    function addProduct(bytes32 _storeFrontId, string _name, uint _price, uint _qty)
        public
        verifyIsApprovedStoreOwner
        returns (bool success) 
    {
        storeFronts[_storeFrontId].productIndex.push(skuCount);
        storeFronts[_storeFrontId].products[skuCount] = Product({
            name: _name,
            sku: skuCount,
            price: _price,
            qty: _qty,
            state: State.ForSale,
            buyer: 0,
            index: storeFronts[_storeFrontId].productIndex.length - 1
        });
        emit ForSale(_storeFrontId, _name, skuCount, _qty);
        skuCount = skuCount + 1;
        return true;
    }
    
    /** Get the number of products in a store
     * @param _storeFrontId The id of the store front
     * @return productCount The count of products in a store.
     */
    function getProductCountForAStore(bytes32 _storeFrontId)
        public
        view
        returns (uint productCount) 
    {
        return storeFronts[_storeFrontId].productIndex.length;
    }
    
     /** Get the product id stored at the provided index
     * @param _storeFrontId The id of the store front
     * @param _index Index to look at.
     * @return productId The count of products in a store.
     */
    function getProductIdStoredAtIndex(bytes32 _storeFrontId, uint _index)
        public
        view
        returns (uint productId) 
    {
        return storeFronts[_storeFrontId].productIndex[_index];
    }
    
    /** Get the product id stored at the provided index
     * @param _storeFrontId The id of the store front
     * @param _sku The product Id to get detail about
     * @return _name The name of the product.
     * @return _price The price of the product
     * @return _qty the quantity available
     * @return _buyer The buyer.
     * @return _state The prodcut state.
     * @return _index
     */
    function getProduct(bytes32 _storeFrontId, uint _sku)
        public
        view
        returns (uint sku, string _name, uint _price, uint _qty, uint _index) 
    {
        return (
            _sku,
            storeFronts[_storeFrontId].products[_sku].name,
            storeFronts[_storeFrontId].products[_sku].price,
            storeFronts[_storeFrontId].products[_sku].qty,
            storeFronts[_storeFrontId].products[_sku].index
        );
    }
        
        
    /**
     * @dev Remove product to tghe store
     * @param _storeFrontId The id of the store front
     * @param _sku The sku # of the product
     */
    function removeProduct(bytes32 _storeFrontId, uint _sku)
        public
        verifyIsApprovedStoreOwner
    {
        emit Removed(_storeFrontId, _sku);

        uint rowToDelete = storeFronts[_storeFrontId].products[_sku].index;
        
        storeFronts[_storeFrontId].products[_sku].state = State.Removed;

        uint skuToMove = storeFronts[_storeFrontId].productIndex[storeFronts[_storeFrontId].productIndex.length - 1];
        
        storeFronts[_storeFrontId].productIndex[rowToDelete] = skuToMove;
        
        storeFronts[_storeFrontId].products[skuToMove].index = rowToDelete;
        
        storeFronts[_storeFrontId].productIndex.length--;
        
        
    }

    /**
     * @dev Change price for a product
     * @param _storeFrontId The id of the store front
     * @param _sku The sku # of the product
     * @param _newPrice The new price for the product
     */
    function changePrice(bytes32 _storeFrontId, uint _sku, uint _newPrice)
        public
        verifyIsApprovedStoreOwner
    {
        uint _oldPrice = storeFronts[_storeFrontId].products[_sku].price;
        storeFronts[_storeFrontId].products[_sku].price = _newPrice;
        emit ChangePrice(_storeFrontId, _sku, _oldPrice, _newPrice);
    }
    
    /**
     * @dev Buyer buys a product
     * @param _storeFrontId The id of the store front
     * @param _sku The sku # of the product
     * @return success     
     */
    function purchaseProduct(bytes32 _storeFrontId, uint _sku, uint _qty)
        public
        payable        
        // forSale(_storeFrontId, _sku)
        paidEnough(storeFronts[_storeFrontId].products[_sku].price)
        qtyAvailable(_storeFrontId, _sku, _qty)
        // checkValue(_storeFrontId, _sku)        
    {
        storeFronts[_storeFrontId].balance = storeFronts[_storeFrontId].balance + storeFronts[_storeFrontId].products[_sku].price;
        storeFronts[_storeFrontId].products[_sku].state = State.Sold;
        storeFronts[_storeFrontId].products[_sku].buyer = msg.sender;
        storeFronts[_storeFrontId].products[_sku].qty = storeFronts[_storeFrontId].products[_sku].qty - _qty;
        emit Sold(_storeFrontId, _sku, _qty, msg.sender);
    }

    /**
     * @dev Withdraw funds from a store and send it to the owner of the store front
     * @param _storeFrontId The id of the store front
     */
    function withdraw(bytes32 _storeFrontId)
        public
        verifyIsApprovedStoreOwner
    {        
        uint _balance = storeFronts[_storeFrontId].balance;
        emit Withdraw(_storeFrontId, _balance);
        storeFronts[_storeFrontId].balance = 0;
        storeFronts[_storeFrontId].owner.transfer(_balance);
        
    }
}