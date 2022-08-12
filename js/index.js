(async() => {
  const $body = document.body;
  const $tbody = document.querySelector('#tbody');
  const $sortButtons = document.querySelectorAll('.table__button');
  const $search = document.querySelector('#search');
  const $loader = document.querySelector('#loader');
  const $overlays = document.querySelectorAll('.modal-overlay');
  const $cancelDeleteButton = document.querySelector('#cancel');
  const $addEditModal = document.querySelector('#add');
  const $deleteModal = document.querySelector('#delete');
  const $modalTitle = document.querySelector('.modal__title');
  const $modalSpan = document.querySelector('.modal__span');
  const $modalInputs = document.querySelectorAll('.modal__input');
  const $saveButton = document.querySelector('#saveBtn');
  const $newClientButton = document.querySelector('#addClient');
  const $modalSelectsDiv = document.querySelector('.modal__selects');
  const $selectTemplate = `
    <select class="modal__select" name="">
      <option value="">Телефон</option>
      <option value="">Доп. телефон</option>
      <option value="">Email</option>
      <option value="">Vk</option>
      <option value="">Facebook</option>
    </select>
    <input class="modal__input modal__select-input" type="text" placeholder="Введите данные контакта">
    <button class="button modal__select-button" type="button">
      <span class="modal__select-button-tooltip">Удалить контакт</span>
      <svg class="modal__select-button-svg">
        <use xlink:href="img/sprite.svg#delete-grey"/>
      </svg>
    </button>
  `;
  
  let columnSort = ''; //идентификатор сортировки (по какой колонке сортируем)
  let dir = ''; //направление сортировки (по возрастанию, по убыванию)
  let clientId; // ID клиента для действий с ним
  let newClient = {}; //новый (добавляемый) клиент
  let newContactObj = {type: '', value: ''}; //объект (один контакт) нового клиента
  
  let clients = await requestsToServer('api/clients', { //первоначальный массив клиентов с сервера
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  });

  renderTable(clients);

  async function requestsToServer(URI, responseObject) { //функция обращения к серверу!!!
    $tbody.innerHTML = '';
    showLoader();
    const response = await fetch(`https://immense-badlands-72114.herokuapp.com/${URI}`, responseObject);
    if (responseObject.method === 'GET') {
      const responseJSON = await response.json();
      hideLoader();
      return responseJSON;
    }
  }

  //################################################################################################
  function createRow(obj) {
    const trTemplate = `
      <td class="table__cell table__cell--grey">${obj.id}</td>
      <td class="table__cell">${obj.fullName}</td>
      <td class="table__cell">${obj.createData}
        <span class="table__cell--grey">&nbsp;${obj.createTime}</span>
      </td>
      <td class="table__cell">${obj.upData}
        <span class="table__cell--grey">&nbsp;${obj.upTime}</span>
      </td>
      <td class="table__cell table__cell--contacts"></td>
      <td class="table__cell table__cell--actions">
        <button id="${obj.id}" class="button table__action-btn table__action-btn--edit">
          <svg class="table__action-svg">
            <use xlink:href="img/sprite.svg#pen"/>
          </svg>Изменить
        </button>
        <button class="button table__action-btn table__action-btn--delete">
          <svg class="table__action-svg">
            <use xlink:href="img/sprite.svg#delete"/>
          </svg>Удалить
        </button>
      </td>
    `;
    const $newTr = document.createElement('tr');
    $newTr.classList.add('table__row');
    $newTr.innerHTML = trTemplate.trim();
    const $contactTd = $newTr.querySelector('.table__cell--contacts');
    if (obj.contacts) {
      let icon;
      for (const contact of obj.contacts) {
        switch(contact.type) {
          case 'Телефон':
            icon = '#phone';
            break;
        
          case 'Facebook':
            icon = '#fb';
            break;
        
          case 'Email':
            icon = '#mail';
            break;

          case 'Vk':
            icon = '#vk';
            break;

          default:
            icon = '#subtract';
            break;
        }
        
        const contactLinkTemplate = createContactLink(contact.value, icon);
        const $a = document.createElement('a');
        $a.classList.add('table__link');
        $a.setAttribute('href', '#');
        $a.setAttribute('aria-label', `${contact.type}`);
        $a.innerHTML = contactLinkTemplate;
        $contactTd.append($a);
      }
    }
    $newTr.addEventListener('click', (event) => buttonsHandler(event, obj.id)); // навешиваем событие на строку таблицы в момент ее создания (до рендеринга)
    return $newTr;
  }
  
  function createContactLink(value, idSvg) {
    const contactLinkTemplate = `
      <span class="table__tooltip">${value}</span>
      <svg class="table__social-svg">
        <use xlink:href="img/sprite.svg${idSvg}"/>
      </svg>
    `;
    return contactLinkTemplate;
  }
  
  function renderTable(arr, value) {
    $tbody.innerHTML = '';
    const formatArr = sort(filter(arr, value), columnSort, dir); //чтобы не "трогать" изначальный массив 'arr'
    // console.log(arr, formatArr); //сравнение изначального массива и отфильтрованного
    for (const obj of formatArr) {
      const clientObj = formatClientObj(obj);
      const $tr = createRow(clientObj); //СОКРАЩЕННЫЙ ВАРИАНТ (ВМЕСТО КОДА НИЖЕ)
      // const $tr = createRow({
      //   id: clientObj.id,
      //   fullName: clientObj.fullName,
      //   createData: clientObj.createData,
      //   createTime: clientObj.createTime,
      //   upData: clientObj.upData,
      //   upTime: clientObj.upTime,
      //   contacts: clientObj.contacts
      // });
      $tbody.append($tr);
    }
  }

  function buttonsHandler(elem = null, idElem) { // обработчик кнопок в строке таблицы (вызывается из функции создания строки таблицы)
    const target = elem.target;
    // clientId = target.closest('.table__row').firstChild.textContent; // ID клиента (активного клиента), взятый из HTML (УЯЗВИМО!!!!!!)
    clientId = idElem; // ID клиента (активного клиента), взятый из массива (ЛУЧШИЙ СПОСОБ!!!)
    if (target.closest('.table__action-btn--edit')) {
      contentElement($modalTitle, 'Изменить данные');
      contentElement($modalSpan, `ID: ${clientId}`);
      contentElement($cancelDeleteButton, 'Удалить клиента');
      $cancelDeleteButton.setAttribute('name', 'delete');
      const indexObj = clients.findIndex(obj => obj.id === clientId);
      $modalInputs.forEach(input => {
        switch(input.name) {
          case 'surname':
            input.value = clients[indexObj].surname; 
            break;
        
          case 'name':
            input.value = clients[indexObj].name; 
            break;
          case 'lastName':
            input.value = clients[indexObj].lastName; 
            break;
        }
        placeholderAnimation(input);
      });
      creatSelect(clients[indexObj].contacts);//создаем селекты из массива объектов контактов ВЫБРАННОГО клиента
      openModal($addEditModal, setModal($addEditModal, clients[indexObj]));
    }

    if (target.closest('.table__action-btn--delete')) {
      openModal($deleteModal, setModal($deleteModal));
    }
    return;
  }

  $newClientButton.addEventListener('click', () => { // обработчик кнопки добавления нового клиента
    contentElement($modalTitle, 'Новый клиент');
    contentElement($modalSpan, '');
    contentElement($cancelDeleteButton, 'Отмена');
    $cancelDeleteButton.setAttribute('name', 'cancel');
    resetForm($modalInputs);
    openModal($addEditModal, setModal($addEditModal));
  });

  function formatClientObj(client) { // переформатирование исходного объекта клиента
    return {
      id: client.id,
      fullName: `${client.surname} ${client.name} ${client.lastName}`,
      createData: formatDate(new Date(client.createdAt)),
      createTime: formatTime(new Date(client.createdAt)),
      upData: formatDate(new Date(client.updatedAt)),
      upTime: formatTime(new Date(client.updatedAt)),
      contacts: client.contacts
    };
  }

  function formatDate(date) {
    let fdata = '';
    let dd = date.getDate();
    let mm = date.getMonth() + 1;
    let yy = date.getFullYear();
    dd = dd < 10 ? '0' + dd : dd; //тернарный оператор (лаконично!!!)
    mm = mm < 10 ? '0' + mm : mm;
    fdata = dd + '.' + mm + '.' + yy;
    return  fdata;
  }

  function formatTime(date) {
    let ftime = '';
    let hh = date.getHours();
    let mm = date.getMinutes() + 1;
    if (hh < 10) hh = '0' + hh; //обычный условный оператор
    if (mm < 10) mm = '0' + mm;
    ftime = hh + ':' + mm;
    return  ftime;
  }

  $sortButtons.forEach((button) => { // кнопки сортировки строк таблицы
    button.addEventListener('click', (event) => {
      const $activeButton = event.currentTarget;
      columnSort = $activeButton.id;
      $activeButton.classList.toggle('up');

      dir = $activeButton.classList.contains('up') ? 'up' : 'down'; //тернарный оператор (вместо 2х строк)
     
      $sortButtons.forEach((button) => {
        if (button !== $activeButton) {
          button.classList.remove('up');
        }
      }) 
      renderTable(clients, $search.value.trim());
    })
  })
   
  function filter(arr, value) {
    if (!value) return [...arr];
    return [...arr].filter((obj) => (obj.id + ' ' + obj.surname + ' ' + obj.name + ' ' + obj.lastName).toUpperCase().includes(value.toUpperCase().trim()));
  }
  
  function sort(arr, column, dir) {
    return [...arr].sort(function (a, b) {
      if (dir === 'up') return ((a[column] > b[column]) ? 1 : -1);
      else return ((a[column] < b[column]) ? 1 : -1);
    });
  }

  function showLoader() {
    $loader.style = 'display: flex;';
  }

  function hideLoader() {
    $loader.style = 'display: none;';
  }
  
  //функция "установки" модального окна
  function setModal(modal, client) {
    if (client) window.location.hash = client.id; // изменение hash строки url
    const clickListener = async function(event) {
      const target = event.target;

      if ((target.closest('.modal__close-button')) || (target.closest('#cancelDelete')) || (target.name === 'cancel')) {
        newClient ={};
        document.querySelectorAll('.validation').forEach(elem => elem.remove());
        $modalInputs.forEach(elem => elem.style = '');
        modal.removeEventListener('click', clickListener);
        closeModal(modal);
        resetForm($modalInputs, $modalSelectsDiv);
      }

      if (((target.closest('.modal__button--save')) && (target.textContent === 'Удалить')) || (target.name === 'delete')) {
        await requestsToServer(`api/clients/${clientId}`, { //первоначальный массив клиентов с сервера
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          },
        });

        clients = await requestsToServer('api/clients', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
        });
     
        renderTable(clients, $search.value.trim());
        modal.removeEventListener('click', clickListener);
        closeModal(modal);
        resetForm($modalInputs, $modalSelectsDiv);
      }

      if (target.closest('#addContactBtn')) creatSelect();

      if (target.closest('.modal__select-button')) {
        target.closest('.modal__select-wrapper').remove();
      }
      
      if (target === $saveButton) {
        const $modalInputs = document.querySelectorAll('.modal__input');

        if (Array.from($modalInputs).every($input => $input.value !== '')) {
          if ($modalTitle.textContent === 'Новый клиент') {
            newClient = getDataFromModal();
            closeModal(modal);
            await requestsToServer('api/clients', {
              method: 'POST',
              body: JSON.stringify(newClient),
              headers: {
                'Content-Type': 'application/json'
              },
            });
          }
          
          if ($modalTitle.textContent === 'Изменить данные') {
            newClient = getDataFromModal(client);
            closeModal(modal);
            await requestsToServer(`api/clients/${client.id}`, {
              method: 'PATCH',
              body: JSON.stringify(newClient),
              headers: {
                'Content-Type': 'application/json'
              },
            });
          }

          clients = await requestsToServer('api/clients', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
          });

          renderTable(clients, $search.value.trim());
          resetForm($modalInputs, $modalSelectsDiv);
          modal.removeEventListener('click', clickListener);
          modal.removeEventListener('input', inputListener);
        } else validation();
      }

      if ((!target.closest('.button')) && (!target.closest('.modal'))) { //закрытие модального окна при клике вне
        modal.removeEventListener('click', clickListener);
        modal.removeEventListener('input', inputListener);
        closeModal(modal);
        resetForm($modalInputs, $modalSelectsDiv);
      }
    }

    const inputListener = function(event) {
      const target = event.target;
      placeholderAnimation(target);

      if ((target.matches('.modal__select-input')) && (target.value)) {
        target.nextElementSibling.classList.add('js-is-active');
        newContactObj.value = target.value;
      } else {
        if ((target.matches('.modal__select-input')) && (!target.value)) {
          target.nextElementSibling.classList.remove('js-is-active');
        }
      }
    }

    const keyListener = function(esc) {
      if (esc.keyCode === 27) {
        modal.removeEventListener('click', clickListener);
        modal.removeEventListener('input', inputListener);
        closeModal(modal);
        resetForm($modalInputs, $modalSelectsDiv);
      }  
    }

    modal.addEventListener('click', clickListener);
    modal.addEventListener('input', inputListener);
    window.addEventListener('keydown', keyListener);
  };
  
  const getDataFromModal = function(client = null) { //ФУНКЦИЯ ПОЛУЧЕНИЯ ДАННЫХ С МОДАЛЬНОГО ОКНА
    const $modalInputs = document.querySelectorAll('.modal__input');
    if (!client) { // если клиент новый
      client = {};
      client.contacts = [];
      client.createdAt = String(new Date());
      client.updatedAt = String(new Date());
      $modalInputs.forEach($input => {
        if (!$input.matches('.modal__select-input')) { //если не является полем ввода у селекта
          client[$input.name] = $input.value;
        }
        if ($input.matches('.modal__select-input')) { //поля ввода селектов
          newContactObj.type = $input.previousElementSibling.children[0].children[0].children[0].textContent;
          newContactObj.value = $input.value;
          client.contacts.push(newContactObj);
          newContactObj = {type: '', value: ''};
        }
      })
    }

    if (client) { // если клиента редактируем
      client.contacts = [];
      client.updatedAt = String(new Date());
      $modalInputs.forEach($input => {
        if (!$input.matches('.modal__select-input')) { //если не является полем ввода у селекта
          client[$input.name] = $input.value;
        }

        if ($input.matches('.modal__select-input')) { //поля ввода селектов
          newContactObj.type = $input.previousElementSibling.children[0].children[0].children[0].textContent;
          newContactObj.value = $input.value;
          client.contacts.push(newContactObj);
          newContactObj = {type: '', value: ''};
        }
      })
    }
    return client;
  }

  function creatSelect(arr = [{}]) {
    for (obj of arr) {
      const $selectWrapper = document.createElement('div');
      $selectWrapper.classList.add('modal__select-wrapper');
      $selectWrapper.innerHTML = $selectTemplate.trim();

      $selectWrapper.querySelectorAll('option').forEach(option => {
        if (option.textContent === obj.type) option.selected = 'selected'; //выбор нужного <option> изменяемого контакта клиента
      });

      if (obj.value) {
        $selectWrapper.querySelector('.modal__select-input').value = obj.value; //соответствующее НЕ ПУСТОЕ значение в поле <input>
        $selectWrapper.querySelector('.modal__select-button').classList.add('js-is-active');
      }
      $modalSelectsDiv.append($selectWrapper);

      const $modalSelect = $selectWrapper.querySelector('select');
      const choices = new Choices($modalSelect, {   //запуск плагина
        searchEnabled: false,
        position: 'down',
      });
      $modalSelect.addEventListener('change', changeOption);
    }
    return
  }

  function validation() {
    const $modalInputs = document.querySelectorAll('.modal__input');
    document.querySelectorAll('.validation').forEach(elem => elem.remove());
    $modalInputs.forEach(($input) => {
      const $textValidation = document.createElement('div');
      $textValidation.classList.add('validation');

      $input.addEventListener('input', function() {
        $textValidation.remove();
        $input.style = '';
        if ($input.matches('.modal__select-input')) {
          $input.placeholder = 'Введите данные контакта';
        }
      });

      if ($input.value === '') {
        if (!$input.matches('.modal__select-input')) {
          
          switch ($input.name) {
            case 'surname':
              $textValidation.textContent = 'Введите Фамилию';
            break

            case 'name':
              $textValidation.textContent = 'Введите Имя';
            break

            case 'lastName':
              $textValidation.textContent = 'Введите Отчество';
            break
          }
        }

        if ($input.matches('.modal__select-input')) {
          let content = $input.previousElementSibling.children[0].children[0].children[0].textContent;
          $textValidation.textContent = `Введите ${content}`;
          $textValidation.style = 'left: 50%; bottom: -5px;';
        }
        $input.style = 'border-color: var(--red)';
        $input.setAttribute('placeholder', '');
        $input.parentElement.append($textValidation);
      }
    })
  }

  const changeOption = function(event) { //функция обработки селекта в модальном окне
    const target = event.target;
    const selectedOption = target.options[target.selectedIndex];
    newContactObj.type = selectedOption.textContent; 
  }

  function resetForm(inputs, div = null) { // очистка полей формы
    function timeOut() {
      inputs.forEach(input => {
        input.value = '';
        placeholderAnimation(input);
      });
      if (div) div.innerHTML = '';
    }
    setTimeout(timeOut, 500); //отсрочка выполнения очистки формы (для визуальной красоты)
  }

  function placeholderAnimation(elem) { // анимация плейсхолдера при вводе текста
    if ((elem.value) && (elem.nextElementSibling.classList.contains('modal__label'))) {
      elem.nextElementSibling.classList.add('focus');
    } else elem.nextElementSibling.classList.remove('focus');

    return;
  };

  function contentElement (elem, content) { // функция заполнения элемента контентом
    elem.textContent = content;
    return;
  }

  function openModal(modal, callbackOpen = null) { // функция открытия модального окна
    modal.classList.add('modal-active');
    modal.children[0].classList.add('scale');
    $body.classList.add('no-scroll');
    if (callbackOpen !== null) callbackOpen();
  }

  function closeModal(modal) { // функция закрытия модального окна
    modal.classList.remove('modal-active');
    modal.children[0].classList.remove('scale');
    $body.classList.remove('no-scroll');
    window.location.hash = '';
  }

  if (window.location.hash !== '') { //hash-часть пути страницы
    const idCard = window.location.hash.split('#').join('');
    const $btnCard = document.getElementById(idCard);
    $btnCard.click(); // вызываем клик на кнопку
  }

  function autocomplete(input) {
    let currentFocus;
    input.addEventListener('input', function(e) {
      const val = this.value.trim();
      let $listItem; //элемент списка
      
      closeAllLists();
      if (!val) { 
        renderTable(clients);
        return false;
      }
      currentFocus = -1;
      const $list = document.createElement('div');/*создание общего элемента DIV (обертка), который будет содержать элементы (значения):*/
      $list.setAttribute('id', this.id + 'autocomplete-list');
      $list.setAttribute('class', 'autocomplete-items');
      this.parentNode.appendChild($list);/*добавление элемента DIV в качестве дочернего элемента контейнера автозаполнения:*/

      for (let i = 0; i < clients.length; i++) {
        const fullName = clients[i].surname + ' ' + clients[i].name + ' ' + clients[i].lastName;
        if (fullName.toUpperCase().includes(val.toUpperCase())) {
          $listItem = document.createElement('div');/*создание элемента DIV для каждого соответствующего элемента:*/

          $listItem.innerHTML = fullName.replace(RegExp(val, 'gi'), '<strong>$&</strong>');//РЕГУЛЯРНОЕ ВЫРАЖЕНИЕ

          $listItem.innerHTML += "<input type='hidden' value='" + fullName +"'>";
          
          $listItem.addEventListener('click', function(e) {/*при клике на элемент списка*/    
              input.value = this.getElementsByTagName('input')[0].value;/*присваиваем значение для текстового поля автозаполнения*/
              renderTable(clients, input.value.trim());
              closeAllLists();
          });

          $list.appendChild($listItem);
        }
      }
    });

    /*выполнение функции нажатия клавиши на клавиатуре:*/
    input.addEventListener('keydown', function(e) {
        let x = document.getElementById(this.id + 'autocomplete-list');
        if (x) x = x.getElementsByTagName('div');
        if (e.keyCode == 40) {
          currentFocus++;/*Если нажата клавиша со стрелкой вниз, увеличиваем текущую переменную фокуса:*/
          addActive(x);/*делаем текущий элемент более заметным:*/
        } else if (e.keyCode == 38) { //вверх
          currentFocus--;/*Если нажата клавиша со стрелкой вверх, уменьшаем текущую переменную фокуса:*/ 
          addActive(x);/*делаем текущий элемент более заметным:*/
        } else if (e.keyCode == 13) {
          e.preventDefault();/*Если нажата клавиша ENTER, не допускаем отправки формы,*/
          renderTable(clients, input.value.trim());
          closeAllLists();
          if (currentFocus > -1) {
            if (x) x[currentFocus].click();/*имитируем щелчок по "активному" пункту:*/
          }
        }
    });

    function addActive(x) {/*функция для классификации элемента как " активного":*/
      if (!x) return false;
      removeActive(x);/*удаление "активного" класса на всех элементах:*/
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = (x.length - 1);
      x[currentFocus].classList.add('autocomplete-active');/*добавление класса "autocomplete-active":*/
    }

    function removeActive(x) {/*функция для удаления класса "active" из всех элементов автозаполнения:*/
      for (let i = 0; i < x.length; i++) {
        x[i].classList.remove('autocomplete-active');
      }
    }
    
    function closeAllLists(elmnt) { /*закрытие всех списков автозаполнения в документе, за исключением того, что было передано в качестве аргумента:*/
      let x = document.getElementsByClassName('autocomplete-items');
      for (let i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != input) {
          x[i].parentNode.removeChild(x[i]);
        }
      }
    }
    
    document.addEventListener('click', function (e) { // клик по документу
      if (input.value) renderTable(clients, input.value.trim());
      closeAllLists(e.target);
    });
  }

  autocomplete($search);
})();