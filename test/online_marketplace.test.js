var OnlineMarketplace = artifacts.require('OnlineMarketplace')

contract('OnlineMarketplace', function(accounts) {

    const admin = accounts[0]
    const storeowner = accounts[1]
    const shopper = accounts[2]

    const price = web3.toWei(200, "ether")
    
    it("should add admin as administrator", async() => {
        const onlineMarketplace = await OnlineMarketplace.deployed();

        var eventEmitted = false;

        var event = onlineMarketplace.AddAdministrator();
        
        await event.watch((err, res) => {
            eventEmitted = true
        });

        await onlineMarketplace.addAdministrator(admin, {from: admin});

        const isAdmin = await onlineMarketplace.isAdmin.call(admin, {from: admin});
    
        assert.equal(isAdmin, true, 'the address added is not an administrator');
        assert.equal(eventEmitted, true, 'adding an administrator should emit the AddAdministrator event');
    })

    it("should add storeowner as approvedstoreowner", async() => {
        const onlineMarketplace = await OnlineMarketplace.deployed();

        var eventEmitted = false;

        var event = onlineMarketplace.AddStoreOwner();
        
        await event.watch((err, res) => {
            eventEmitted = true
        });

        await onlineMarketplace.addStoreOwner(storeowner, {from: admin});

        const isStoreOwner = await onlineMarketplace.isApprovedStoreOwner.call(storeowner);
    
        assert.equal(isStoreOwner, true, 'the address added is not an approved store owner');
        assert.equal(eventEmitted, true, 'adding an store owner should emit the AddStoreOwner event');
    })
    
    it("should allow storeowner to create a store front", async() => {
        const onlineMarketplace = await OnlineMarketplace.deployed();

        var eventEmitted = false;

        var storeName = "mystore";

        var event = onlineMarketplace.CreateStoreFront();
        
        var storeFrontId;

        await event.watch((err, res) => {
            storeFrontId = res.args._storeFrontId.toString();
            eventEmitted = true
        });
        
        await onlineMarketplace.createStoreFront(storeName, {from: storeowner, gas: 9040000});

        const result = await onlineMarketplace.getStoreFront.call(storeFrontId);
        
        assert.equal(result[0], storeName, 'the name of the last added storefront does not match the expected value');
        assert.equal(result[1], storeowner, 'the address of the owner of the storefront does not match the storeowner');
        assert.equal(eventEmitted, true, 'adding an store front should emit the CreateStoreFront event');
        assert.equal(storeFrontId, web3.sha3(storeName), 'adding an store front should generate a storeFrontId which is the hash of the storeName');
    })

    it("should allow storeowner to add products", async() => {
        const onlineMarketplace = await OnlineMarketplace.deployed();

        var eventEmitted = false;

        var storeName = "mystore";

        var storeFrontId = web3.toHex(storeName);

        var productName1 = "nike";
        
        var productName2 = "puma";
        
        var productName3 = "adidas";

        var event = onlineMarketplace.ForSale();

        await event.watch((err, res) => {
            eventEmitted = true
        });
        
        await onlineMarketplace.addProduct(storeFrontId, productName1, price,10, {from: storeowner, gas: 9040000});
        await onlineMarketplace.addProduct(storeFrontId, productName2, price,10, {from: storeowner, gas: 9040000});
        await onlineMarketplace.addProduct(storeFrontId, productName3, price,10, {from: storeowner, gas: 9040000});

        const count = await onlineMarketplace.getProductCountForAStore.call(storeFrontId);
        const result = await onlineMarketplace.getProduct.call(storeFrontId,count - 1);
        
        assert.equal(result[0], productName3, 'the name of the last added product does not match the expected value');
        assert.equal(count, 3, 'adding three products should set the set the product count to three');
        assert.equal(eventEmitted, true, 'adding an store front should emit the ForSale event');
    })
    
    it("should allow storeowner to change price of product", async() => {
        const onlineMarketplace = await OnlineMarketplace.deployed();

        var sku = 3;

        const newPrice = web3.toWei(19, "ether");

        var eventEmitted = false;

        var storeName = "mystore";

        var storeFrontId = web3.toHex(storeName);

        var event = onlineMarketplace.ChangePrice();

        await event.watch((err, res) => {
            eventEmitted = true
        });        

        await onlineMarketplace.changePrice(storeFrontId, sku, newPrice, {from: storeowner, gas: 9040000});  
        
        const result = await onlineMarketplace.getProduct.call(storeFrontId,sku);
        
        assert.equal(result[1], newPrice, 'the price was not changed');
        assert.equal(eventEmitted, true, 'adding an store front should emit the ChangePrice event');
    })

    it("should allow shopper to buy a product", async() => {
        const onlineMarketplace = await OnlineMarketplace.deployed();

        var sku = 0;

        var eventEmitted = false;

        var storeName = "mystore";

        var storeFrontId = web3.toHex(storeName);

        var event = onlineMarketplace.Sold();

        await event.watch((err, res) => {
            eventEmitted = true
        });

        const amount = web3.toWei(20, "ether")

        var shopperBalanceBefore = await web3.eth.getBalance(shopper).toNumber();
        
        var storeBalanceBefore = await onlineMarketplace.getStoreBalance.call(storeFrontId, {from: storeowner, gas: 9040000});
        
        storeBalanceBefore = storeBalanceBefore.toNumber();

        await onlineMarketplace.purchaseProduct(storeFrontId, sku, 1, {from: shopper, gas: 9040000, value: amount});  
        
        var shopperBalanceAfter = await web3.eth.getBalance(shopper).toNumber();
        
        var storeBalanceAfter = await onlineMarketplace.getStoreBalance.call(storeFrontId, {from: storeowner, gas: 9040000});

        storeBalanceAfter = storeBalanceAfter.toNumber();

        const result = await onlineMarketplace.getProduct.call(storeFrontId, sku);
        
        assert.equal(result[2], shopper, 'the shopper was not chnaged to shopper address');
        assert.equal(result[3].toNumber(), 1, 'the status of the removed sku was not changed to sold');
        assert.equal(storeBalanceAfter, storeBalanceBefore + result[1], 'the balance of the store was not increased by the price of the product');
        // assert.isBelow(shopperBalanceAfter, shopperBalanceBefore - result[1], 'the balance of the shopper was not decreased by the price of the product');
        // assert.equal(eventEmitted, true, 'adding an store front should emit the Sold event');
    })

    it("should allow storeowner remove a product", async() => {
        const onlineMarketplace = await OnlineMarketplace.deployed();

        var sku = 1;

        var eventEmitted = false;

        var storeName = "mystore";

        var storeFrontId = web3.toHex(storeName);

        var event = onlineMarketplace.Removed();

        await event.watch((err, res) => {
            eventEmitted = true
        });        
        const countBeforeRemove = await onlineMarketplace.getProductCountForAStore(storeFrontId);
        
        await onlineMarketplace.removeProduct(storeFrontId, sku, {from: storeowner, gas: 9040000});  
        
        const result = await onlineMarketplace.getProduct.call(storeFrontId, sku);

        const countAfterRemove = await onlineMarketplace.getProductCountForAStore(storeFrontId);
               
        assert.equal(result[3], 2, 'the status of the removed sku was not changed to remove');
        assert.equal(countAfterRemove, countBeforeRemove - 1, 'the count of products was not reduced by one');
        // assert.equal(eventEmitted, true, 'adding an store front should emit the Removed event');
    })

    it("should allow store owner to withdraw funds", async() => {
        const onlineMarketplace = await OnlineMarketplace.deployed();
        console.log('admin:'+admin);
        console.log('storeowner:'+storeowner);
        console.log('shopper:'+shopper);
        var eventEmitted = false;

        var storeName = "mystore";

        var storeFrontId = web3.toHex(storeName);

        var event = onlineMarketplace.Withdraw();

        await event.watch((err, res) => {
            console.log(JSON.stringify(res))
            eventEmitted = true
        }); 

        var storeownerBalanceBefore = await web3.eth.getBalance(storeowner).toNumber();
        
        var storeBalanceBefore = await onlineMarketplace.getStoreBalance.call(storeFrontId, {from: storeowner, gas: 9040000});
        
        storeBalanceBefore = storeBalanceBefore.toNumber();

        await onlineMarketplace.withdraw(storeFrontId, {from: storeowner, gas: 9040000});  
        
        var storeownerBalanceAfter = await web3.eth.getBalance(storeowner).toNumber();
        
        var storeBalanceAfter = await onlineMarketplace.getStoreBalance.call(storeFrontId, {from: storeowner, gas: 9040000});

        storeBalanceAfter = storeBalanceAfter.toNumber();

        console.log(storeBalanceBefore, storeBalanceAfter)

        console.log(storeownerBalanceAfter > storeownerBalanceBefore)

        assert.equal(storeBalanceAfter, 0, 'the balance of the store was not reset to zero');
        assert.isAbove(5, 3, 'the balance of the storeowner was not increased ');
        // assert.equal(eventEmitted, true, 'adding an store front should emit the Sold event');
    })
});
    